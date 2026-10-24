import { format } from "date-fns";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimits } from "@/lib/rate-limit";
import { resetStores } from "@/lib/repositories/memory/store";

vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");

import { GET as getCheckins, POST as postCheckin } from "@/app/api/checkins/route";
import { DELETE as deleteCheckin } from "@/app/api/checkins/[id]/route";
import { GET as getWeights, POST as postWeight } from "@/app/api/weights/route";
import { DELETE as deleteWeight, PUT as putWeight } from "@/app/api/weights/[id]/route";
import { GET as getMemberships, POST as postMembership } from "@/app/api/membership/route";
import { PUT as putMembership } from "@/app/api/membership/[id]/route";

const today = format(new Date(), "yyyy-MM-dd");
const json = (body: unknown) =>
  new Request("http://localhost/api/x", { method: "POST", body: JSON.stringify(body) });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) }) as never;

beforeEach(() => {
  resetStores();
  resetRateLimits();
});

describe("/api/checkins", () => {
  it("rejects invalid bodies", async () => {
    const res = await postCheckin(json({ date: "nope", went_to_gym: true }));
    expect(res.status).toBe(400);
  });

  it("rejects future dates and out of range scales", async () => {
    expect((await postCheckin(json({ date: "2999-01-01", went_to_gym: true }))).status).toBe(400);
    expect((await postCheckin(json({ date: today, went_to_gym: true, mood: 9 }))).status).toBe(400);
  });

  it("upserts one check-in per date", async () => {
    await postCheckin(json({ date: today, went_to_gym: true }));
    const second = await postCheckin(json({ date: today, went_to_gym: false, mood: 4 }));
    expect(second.status).toBe(200);

    const { data } = await (await getCheckins()).json();
    const forToday = data.filter((c: { date: string }) => c.date === today);
    expect(forToday).toHaveLength(1);
    expect(forToday[0]).toMatchObject({ went_to_gym: false, mood: 4 });
  });

  it("deletes and then returns 404 for a missing id", async () => {
    const { data } = await (await postCheckin(json({ date: today, went_to_gym: true }))).json();
    expect((await deleteCheckin(new Request("http://x"), ctx(data.id))).status).toBe(200);
    expect((await deleteCheckin(new Request("http://x"), ctx(data.id))).status).toBe(404);
  });
});

describe("/api/weights", () => {
  it("validates weight range", async () => {
    expect((await postWeight(json({ date: today, weight_kg: 5 }))).status).toBe(400);
    expect((await postWeight(json({ date: today, weight_kg: "70" }))).status).toBe(400);
  });

  it("creates, updates and deletes an entry", async () => {
    const created = await postWeight(json({ date: today, weight_kg: 70.5 }));
    expect(created.status).toBe(201);
    const { data } = await created.json();

    const updated = await putWeight(json({ date: today, weight_kg: 69.9 }), ctx(data.id));
    expect((await updated.json()).data.weight_kg).toBe(69.9);

    expect((await deleteWeight(new Request("http://x"), ctx(data.id))).status).toBe(200);
    expect((await putWeight(json({ date: today, weight_kg: 70 }), ctx(data.id))).status).toBe(404);
  });

  it("lists newest first", async () => {
    const { data } = await (await getWeights()).json();
    const dates = data.map((w: { date: string }) => w.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });
});

describe("/api/membership", () => {
  it("stores an optional location, trims it, and allows clearing it", async () => {
    const base = { gym_name: "Iron", start_date: "2026-10-01", end_date: "2026-12-01" };

    const withLocation = await postMembership(json({ ...base, location: "  Central Branch, Main St  " }));
    expect((await withLocation.json()).data.location).toBe("Central Branch, Main St");

    const without = await postMembership(json(base));
    expect((await without.json()).data.location).toBeNull();

    const blank = await postMembership(json({ ...base, location: "   " }));
    expect((await blank.json()).data.location).toBeNull();

    const { data } = await (await postMembership(json({ ...base, location: "Old place" }))).json();
    const updated = await putMembership(json({ ...base, location: "New place" }), ctx(data.id));
    expect((await updated.json()).data.location).toBe("New place");
    const cleared = await putMembership(json({ ...base, location: null }), ctx(data.id));
    expect((await cleared.json()).data.location).toBeNull();
  });

  it("stores a pinned position, replaces it and clears it", async () => {
    const base = { gym_name: "Iron", start_date: "2026-10-01", end_date: "2026-12-01" };

    const created = await postMembership(json({ ...base, latitude: -6.2088, longitude: 106.8456 }));
    expect((await created.json()).data).toMatchObject({ latitude: -6.2088, longitude: 106.8456 });

    const none = await postMembership(json(base));
    expect((await none.json()).data).toMatchObject({ latitude: null, longitude: null });

    const { data } = await (await postMembership(json({ ...base, latitude: 1, longitude: 2 }))).json();
    const moved = await putMembership(json({ ...base, latitude: -7.25, longitude: 112.75 }), ctx(data.id));
    expect((await moved.json()).data).toMatchObject({ latitude: -7.25, longitude: 112.75 });
    const cleared = await putMembership(json({ ...base, latitude: null, longitude: null }), ctx(data.id));
    expect((await cleared.json()).data).toMatchObject({ latitude: null, longitude: null });
  });

  it("rejects half a position and impossible coordinates", async () => {
    const base = { gym_name: "Iron", start_date: "2026-10-01", end_date: "2026-12-01" };
    expect((await postMembership(json({ ...base, latitude: 10 }))).status).toBe(400);
    expect((await postMembership(json({ ...base, longitude: 10 }))).status).toBe(400);
    expect((await postMembership(json({ ...base, latitude: 91, longitude: 0 }))).status).toBe(400);
    expect((await postMembership(json({ ...base, latitude: 0, longitude: 181 }))).status).toBe(400);
    expect((await postMembership(json({ ...base, latitude: "1", longitude: "2" }))).status).toBe(400);
    expect((await postMembership(json({ ...base, latitude: 90, longitude: -180 }))).status).toBe(201);
  });

  it("rejects a location longer than 120 characters", async () => {
    const base = { gym_name: "Iron", start_date: "2026-10-01", end_date: "2026-12-01" };
    expect((await postMembership(json({ ...base, location: "x".repeat(120) }))).status).toBe(201);
    expect((await postMembership(json({ ...base, location: "x".repeat(121) }))).status).toBe(400);
    expect((await postMembership(json({ ...base, location: 12345 }))).status).toBe(400);
  });

  it("rejects an end date before the start date", async () => {
    const res = await postMembership(
      json({ gym_name: "Gym", start_date: "2026-10-10", end_date: "2026-10-01" }),
    );
    expect(res.status).toBe(400);
  });

  it("creates and updates a membership", async () => {
    const created = await postMembership(
      json({ gym_name: "Iron", start_date: "2026-10-01", end_date: "2026-12-01", price: 100 }),
    );
    expect(created.status).toBe(201);
    const { data } = await created.json();

    const updated = await putMembership(
      json({ gym_name: "Iron", start_date: "2026-10-01", end_date: "2027-01-01", price: null }),
      ctx(data.id),
    );
    expect((await updated.json()).data).toMatchObject({ end_date: "2027-01-01", price: null });

    const list = (await (await getMemberships()).json()).data;
    expect(list[0].end_date).toBe("2027-01-01");
  });
});

describe("write rate limiting", () => {
  it("returns 429 after 30 writes in a minute", async () => {
    let last = 200;
    for (let i = 0; i < 31; i++) {
      last = (await postWeight(json({ date: today, weight_kg: 70 }))).status;
    }
    expect(last).toBe(429);
  });
});
