import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimits } from "@/lib/rate-limit";
import { resetStores } from "@/lib/repositories/memory/store";

vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");

import { DELETE as deleteBlock, PUT as putBlock } from "@/app/api/availability/[id]/route";
import { GET as getBlocks, POST as postBlock } from "@/app/api/availability/route";
import { listAvailability } from "@/lib/repositories/availability";

const json = (body: unknown) =>
  new Request("http://localhost/api/x", { method: "POST", body: JSON.stringify(body) });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) }) as never;
const valid = { weekday: 3, start_time: "09:00", end_time: "11:30", label: "Lab" };

beforeEach(() => {
  resetStores();
  resetRateLimits();
});

describe("/api/availability", () => {
  it("lists seeded commitments Monday first, then by start time", async () => {
    await postBlock(json({ weekday: 1, start_time: "06:00", end_time: "07:00" }));
    await postBlock(json({ weekday: 0, start_time: "10:00", end_time: "11:00" }));
    const { data } = await (await getBlocks()).json();

    expect(data[0]).toMatchObject({ weekday: 1, start_time: "06:00" });
    expect(data[1]).toMatchObject({ weekday: 1, start_time: "08:00" });
    expect(data[data.length - 1].weekday).toBe(0); // Sunday is last
  });

  it("creates a block", async () => {
    const res = await postBlock(json(valid));
    expect(res.status).toBe(201);
    expect((await res.json()).data).toMatchObject(valid);
  });

  it("stores an empty label as null", async () => {
    const { data } = await (await postBlock(json({ ...valid, label: "  " }))).json();
    expect(data.label).toBeNull();
  });

  it("rejects bad weekdays, times and ordering", async () => {
    expect((await postBlock(json({ ...valid, weekday: 7 }))).status).toBe(400);
    expect((await postBlock(json({ ...valid, weekday: -1 }))).status).toBe(400);
    expect((await postBlock(json({ ...valid, weekday: 1.5 }))).status).toBe(400);
    expect((await postBlock(json({ ...valid, start_time: "9:00" }))).status).toBe(400);
    expect((await postBlock(json({ ...valid, start_time: "24:00" }))).status).toBe(400);
    expect((await postBlock(json({ ...valid, end_time: "08:59" }))).status).toBe(400);
    expect((await postBlock(json({ ...valid, end_time: valid.start_time }))).status).toBe(400);
    expect((await postBlock(json({ ...valid, label: "x".repeat(61) }))).status).toBe(400);
    expect((await postBlock(json(null))).status).toBe(400);
  });

  it("updates and deletes a block, then 404s", async () => {
    const { data } = await (await postBlock(json(valid))).json();

    const updated = await putBlock(json({ ...valid, end_time: "12:00" }), ctx(data.id));
    expect((await updated.json()).data.end_time).toBe("12:00");
    expect((await putBlock(json({ ...valid, end_time: "08:00" }), ctx(data.id))).status).toBe(400);

    expect((await deleteBlock(new Request("http://x"), ctx(data.id))).status).toBe(200);
    expect((await deleteBlock(new Request("http://x"), ctx(data.id))).status).toBe(404);
    expect((await putBlock(json(valid), ctx(data.id))).status).toBe(404);
  });

  it("does not expose another user's blocks", async () => {
    expect(await listAvailability("someone-else")).toEqual([]);
  });

  it("rate limits writes", async () => {
    let last = 201;
    for (let i = 0; i < 31; i++) last = (await postBlock(json(valid))).status;
    expect(last).toBe(429);
  });
});
