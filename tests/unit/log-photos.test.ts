import { format } from "date-fns";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_LOG_PHOTOS_PER_ENTRY, MAX_PHOTO_BYTES } from "@/lib/photo-file";
import { resetRateLimits } from "@/lib/rate-limit";
import { resetStores } from "@/lib/repositories/memory/store";

vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");

// The demo gym is pinned at this point, so a position here counts as being at the gym.
const AT_GYM = { latitude: -6.2088, longitude: 106.8456, accuracy: 15 };

import { DELETE as deleteCheckin } from "@/app/api/checkins/[id]/route";
import { POST as postCheckin } from "@/app/api/checkins/route";
import { DELETE as deleteLogPhoto } from "@/app/api/log-photos/[id]/route";
import { GET as getLogPhotoFile } from "@/app/api/log-photos/[id]/file/route";
import { GET as listLogPhotosRoute, POST as postLogPhoto } from "@/app/api/log-photos/route";
import { DELETE as deleteWeight } from "@/app/api/weights/[id]/route";
import { POST as postWeight } from "@/app/api/weights/route";
import { getLogPhotoFile as repoGetFile, listLogPhotos } from "@/lib/repositories/logPhotos";

const DEMO = "00000000-0000-4000-8000-000000000001";
const today = format(new Date(), "yyyy-MM-dd");
const ctx = (id: string) => ({ params: Promise.resolve({ id }) }) as never;
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6]);

const json = (body: unknown) =>
  new Request("http://localhost/api/x", { method: "POST", body: JSON.stringify(body) });

function upload(
  content: Uint8Array | string,
  fields: Record<string, string>,
  filename = "selfie.jpg",
) {
  const form = new FormData();
  if (typeof content !== "string" || content.length > 0) {
    form.set("file", new File([content as BlobPart], filename, { type: "image/jpeg" }));
  }
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return new Request("http://localhost/api/log-photos", { method: "POST", body: form });
}

async function newCheckin() {
  return (await (await postCheckin(json({ date: today, went_to_gym: true, ...AT_GYM }))).json()).data.id as string;
}
async function newWeight() {
  return (await (await postWeight(json({ date: today, weight_kg: 70 }))).json()).data.id as string;
}

beforeEach(() => {
  resetStores();
  resetRateLimits();
});

describe("uploading to a check-in", () => {
  it("stores the photo and serves it back privately", async () => {
    const entry = await newCheckin();
    const res = await postLogPhoto(upload(JPEG, { kind: "checkin", entry_id: entry }));
    expect(res.status).toBe(201);
    const { data } = await res.json();
    expect(data).toMatchObject({ checkin_id: entry, weight_id: null });
    expect(data.storage_path).toMatch(new RegExp(`^${DEMO}/log/${data.id}\\.jpg$`));

    const file = await getLogPhotoFile(new Request("http://x"), ctx(data.id));
    expect(file.status).toBe(200);
    expect(file.headers.get("content-type")).toBe("image/jpeg");
    expect(file.headers.get("cache-control")).toBe("private, no-store");
    expect(file.headers.get("x-content-type-options")).toBe("nosniff");
    expect(file.headers.get("content-security-policy")).toContain("sandbox");
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(JPEG);
  });

  it("lists photos for one entry, newest first, metadata only", async () => {
    const entry = await newCheckin();
    for (let i = 0; i < 2; i++) await postLogPhoto(upload(JPEG, { kind: "checkin", entry_id: entry }));

    const res = await listLogPhotosRoute(
      new Request(`http://localhost/api/log-photos?kind=checkin&entry_id=${entry}`),
    );
    const { data } = await res.json();
    expect(data).toHaveLength(2);
    expect(data.every((p: { checkin_id: string }) => p.checkin_id === entry)).toBe(true);
    expect(Object.keys(data[0]).sort()).toEqual([
      "checkin_id",
      "created_at",
      "id",
      "storage_path",
      "user_id",
      "weight_id",
    ]);
  });

  it("keeps the photos when the same day's check-in is saved again", async () => {
    const entry = await newCheckin();
    await postLogPhoto(upload(JPEG, { kind: "checkin", entry_id: entry }));
    const again = await postCheckin(json({ date: today, went_to_gym: false, mood: 2 }));
    expect((await again.json()).data.id).toBe(entry);
    expect(await listLogPhotos(DEMO, { kind: "checkin", entryId: entry })).toHaveLength(1);
  });

  it("stops at four photos per entry", async () => {
    const entry = await newCheckin();
    for (let i = 0; i < MAX_LOG_PHOTOS_PER_ENTRY; i++) {
      expect((await postLogPhoto(upload(JPEG, { kind: "checkin", entry_id: entry }))).status).toBe(201);
    }
    expect((await postLogPhoto(upload(JPEG, { kind: "checkin", entry_id: entry }))).status).toBe(409);
  });
});

describe("uploading to a weigh-in", () => {
  it("attaches to the weigh-in, not a check-in", async () => {
    const entry = await newWeight();
    const res = await postLogPhoto(upload(JPEG, { kind: "weight", entry_id: entry }));
    expect(res.status).toBe(201);
    expect((await res.json()).data).toMatchObject({ weight_id: entry, checkin_id: null });
  });

  it("does not treat a weigh-in id as a check-in id", async () => {
    const weight = await newWeight();
    expect((await postLogPhoto(upload(JPEG, { kind: "checkin", entry_id: weight }))).status).toBe(404);
  });

  it("filters the list by kind", async () => {
    const c = await newCheckin();
    const w = await newWeight();
    await postLogPhoto(upload(JPEG, { kind: "checkin", entry_id: c }));
    await postLogPhoto(upload(JPEG, { kind: "weight", entry_id: w }));

    const onlyWeight = await (
      await listLogPhotosRoute(new Request("http://localhost/api/log-photos?kind=weight"))
    ).json();
    expect(onlyWeight.data.length).toBeGreaterThanOrEqual(1);
    expect(onlyWeight.data.every((p: { weight_id: string | null }) => p.weight_id !== null)).toBe(true);
    expect(
      (await (await listLogPhotosRoute(new Request("http://localhost/api/log-photos?kind=nope"))).json()).error,
    ).toBeDefined();
  });
});

describe("validation and safety", () => {
  it("rejects an unknown entry", async () => {
    expect((await postLogPhoto(upload(JPEG, { kind: "checkin", entry_id: "does-not-exist" }))).status).toBe(404);
    expect(
      (await postLogPhoto(upload(JPEG, { kind: "weight", entry_id: "00000000-0000-4000-8000-000000000000" })))
        .status,
    ).toBe(404);
  });

  it("rejects bad kinds, missing fields and a missing file", async () => {
    const entry = await newCheckin();
    expect((await postLogPhoto(upload(JPEG, { kind: "progress", entry_id: entry }))).status).toBe(400);
    expect((await postLogPhoto(upload(JPEG, { entry_id: entry }))).status).toBe(400);
    expect((await postLogPhoto(upload(JPEG, { kind: "checkin" }))).status).toBe(400);
    expect((await postLogPhoto(upload("", { kind: "checkin", entry_id: entry }))).status).toBe(400);
    expect((await postLogPhoto(json({ kind: "checkin", entry_id: entry }))).status).toBe(400);
  });

  it("ignores the claimed type and rejects non image content, including SVG", async () => {
    const entry = await newCheckin();
    const fields = { kind: "checkin", entry_id: entry };
    expect((await postLogPhoto(upload("<script>alert(1)</script>", fields))).status).toBe(400);
    expect(
      (await postLogPhoto(upload('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>', fields, "x.svg"))).status,
    ).toBe(400);
    expect(await listLogPhotos(DEMO, { kind: "checkin", entryId: entry })).toHaveLength(0);
  });

  it("rejects files over 5 MB", async () => {
    const entry = await newCheckin();
    const big = new Uint8Array(MAX_PHOTO_BYTES + 1);
    big.set(JPEG, 0);
    expect((await postLogPhoto(upload(big, { kind: "checkin", entry_id: entry }))).status).toBe(413);
  });

  it("rate limits uploads to 10 per minute", async () => {
    const entries = [await newWeight(), await newWeight(), await newWeight()];
    let last = 201;
    let sent = 0;
    for (const entry of entries) {
      for (let i = 0; i < MAX_LOG_PHOTOS_PER_ENTRY && sent < 11; i++, sent++) {
        last = (await postLogPhoto(upload(JPEG, { kind: "weight", entry_id: entry }))).status;
      }
    }
    expect(sent).toBe(11);
    expect(last).toBe(429);
  });

  it("returns 404 for an unknown photo file", async () => {
    expect((await getLogPhotoFile(new Request("http://x"), ctx("missing"))).status).toBe(404);
  });
});

describe("deleting", () => {
  it("deletes one photo and its file, then 404s", async () => {
    const entry = await newCheckin();
    const { data } = await (await postLogPhoto(upload(JPEG, { kind: "checkin", entry_id: entry }))).json();
    expect((await deleteLogPhoto(new Request("http://x"), ctx(data.id))).status).toBe(200);
    expect((await getLogPhotoFile(new Request("http://x"), ctx(data.id))).status).toBe(404);
    expect((await deleteLogPhoto(new Request("http://x"), ctx(data.id))).status).toBe(404);
  });

  it("removes a check-in's photos and files with the check-in", async () => {
    const entry = await newCheckin();
    const { data } = await (await postLogPhoto(upload(JPEG, { kind: "checkin", entry_id: entry }))).json();
    expect((await deleteCheckin(new Request("http://x"), ctx(entry))).status).toBe(200);
    expect(await listLogPhotos(DEMO, { kind: "checkin", entryId: entry })).toHaveLength(0);
    expect(await repoGetFile(DEMO, data.id)).toBeNull();
  });

  it("removes a weigh-in's photos and files with the weigh-in, and leaves others alone", async () => {
    const a = await newWeight();
    const b = await newWeight();
    const { data } = await (await postLogPhoto(upload(JPEG, { kind: "weight", entry_id: a }))).json();
    await postLogPhoto(upload(JPEG, { kind: "weight", entry_id: b }));

    expect((await deleteWeight(new Request("http://x"), ctx(a))).status).toBe(200);
    expect(await repoGetFile(DEMO, data.id)).toBeNull();
    expect(await listLogPhotos(DEMO, { kind: "weight", entryId: b })).toHaveLength(1);
  });
});

describe("privacy", () => {
  it("does not let another user read or list photos", async () => {
    const entry = await newCheckin();
    const { data } = await (await postLogPhoto(upload(JPEG, { kind: "checkin", entry_id: entry }))).json();
    expect(await repoGetFile("someone-else", data.id)).toBeNull();
    expect(await listLogPhotos("someone-else")).toEqual([]);
  });

  it("seeds demo placeholders on a past check-in and the latest weigh-in", async () => {
    const all = await listLogPhotos(DEMO);
    expect(all.some((p) => p.checkin_id !== null)).toBe(true);
    expect(all.some((p) => p.weight_id !== null)).toBe(true);
  });
});
