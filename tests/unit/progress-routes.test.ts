import { format } from "date-fns";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_PHOTO_BYTES, MAX_PHOTOS_PER_USER } from "@/lib/photo-file";
import { resetRateLimits } from "@/lib/rate-limit";
import { resetStores } from "@/lib/repositories/store";

vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");

import { DELETE as deleteMeasurement } from "@/app/api/measurements/[id]/route";
import { GET as getMeasurements, POST as postMeasurement } from "@/app/api/measurements/route";
import { GET as getPhotoFile } from "@/app/api/photos/[id]/file/route";
import { DELETE as deletePhoto } from "@/app/api/photos/[id]/route";
import { GET as getPhotos, POST as postPhoto } from "@/app/api/photos/route";
import { createPhoto, getPhotoFile as repoGetFile, listPhotos } from "@/lib/repositories/photos";

const DEMO = "00000000-0000-4000-8000-000000000001";
const today = format(new Date(), "yyyy-MM-dd");
const ctx = (id: string) => ({ params: Promise.resolve({ id }) }) as never;

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6]);

function upload(
  content: Uint8Array | string,
  fields: Record<string, string> = { date: today, pose: "front" },
  filename = "me.jpg",
) {
  const form = new FormData();
  if (typeof content !== "string" || content.length > 0) {
    form.set("file", new File([content as BlobPart], filename, { type: "image/jpeg" }));
  }
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return new Request("http://localhost/api/photos", { method: "POST", body: form });
}

const json = (body: unknown) =>
  new Request("http://localhost/api/x", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  resetStores();
  resetRateLimits();
});

describe("POST /api/photos", () => {
  it("stores a valid photo and serves it back privately", async () => {
    const res = await postPhoto(upload(JPEG));
    expect(res.status).toBe(201);
    const { data } = await res.json();
    expect(data).toMatchObject({ pose: "front", date: today });
    expect(data.storage_path).toMatch(new RegExp(`^${DEMO}/${data.id}\\.jpg$`));

    const file = await getPhotoFile(new Request("http://x"), ctx(data.id));
    expect(file.status).toBe(200);
    expect(file.headers.get("content-type")).toBe("image/jpeg");
    expect(file.headers.get("cache-control")).toBe("private, no-store");
    expect(file.headers.get("x-content-type-options")).toBe("nosniff");
    expect(file.headers.get("content-security-policy")).toContain("sandbox");
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(JPEG);
  });

  it("ignores the claimed type and rejects non image content", async () => {
    const res = await postPhoto(upload("<script>alert(1)</script>", undefined, "me.jpg"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("JPEG, PNG or WebP");
    expect(await listPhotos(DEMO)).toHaveLength(5); // only the seeded placeholders
  });

  it("rejects SVG uploads", async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>';
    expect((await postPhoto(upload(svg, undefined, "x.svg"))).status).toBe(400);
  });

  it("rejects files over 5 MB", async () => {
    const big = new Uint8Array(MAX_PHOTO_BYTES + 1);
    big.set(JPEG, 0);
    expect((await postPhoto(upload(big))).status).toBe(413);
  });

  it("rejects an empty file, a missing file, bad poses and future dates", async () => {
    expect((await postPhoto(upload(new Uint8Array(0)))).status).toBe(400);
    expect((await postPhoto(upload("", { date: today, pose: "front" }))).status).toBe(400);
    expect((await postPhoto(upload(JPEG, { date: today, pose: "top" }))).status).toBe(400);
    expect((await postPhoto(upload(JPEG, { date: "2999-01-01", pose: "front" }))).status).toBe(400);
    expect((await postPhoto(upload(JPEG, { date: "nope", pose: "front" }))).status).toBe(400);
  });

  it("rejects a body that is not multipart form data", async () => {
    const res = await postPhoto(json({ date: today, pose: "front" }));
    expect(res.status).toBe(400);
  });

  it("stops at the per user photo limit", async () => {
    const current = (await listPhotos(DEMO)).length;
    for (let i = current; i < MAX_PHOTOS_PER_USER; i++) {
      await createPhoto(DEMO, { date: today, pose: "front" }, JPEG, "image/jpeg");
    }
    expect((await postPhoto(upload(JPEG))).status).toBe(409);
  });

  it("rate limits uploads to 10 per minute", async () => {
    let last = 201;
    for (let i = 0; i < 11; i++) last = (await postPhoto(upload(JPEG))).status;
    expect(last).toBe(429);
  });
});

describe("photo access", () => {
  it("lists metadata newest first and never includes bytes", async () => {
    const { data } = await (await getPhotos()).json();
    const dates = data.map((p: { date: string }) => p.date);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(Object.keys(data[0]).sort()).toEqual(["date", "id", "pose", "storage_path", "user_id"]);
  });

  it("does not let another user read or delete a photo", async () => {
    const [photo] = await listPhotos(DEMO);
    expect(await repoGetFile("someone-else", photo.id)).toBeNull();
    expect(await listPhotos("someone-else")).toEqual([]);
  });

  it("deletes the record and the file, then 404s", async () => {
    const { data } = await (await postPhoto(upload(JPEG))).json();
    expect((await deletePhoto(new Request("http://x"), ctx(data.id))).status).toBe(200);
    expect((await getPhotoFile(new Request("http://x"), ctx(data.id))).status).toBe(404);
    expect((await deletePhoto(new Request("http://x"), ctx(data.id))).status).toBe(404);
  });

  it("returns 404 for an unknown photo file", async () => {
    expect((await getPhotoFile(new Request("http://x"), ctx("missing"))).status).toBe(404);
  });
});

describe("/api/measurements", () => {
  it("requires at least one value", async () => {
    expect((await postMeasurement(json({ date: today }))).status).toBe(400);
    expect((await postMeasurement(json({ date: today, waist_cm: null }))).status).toBe(400);
  });

  it("validates ranges", async () => {
    expect((await postMeasurement(json({ date: today, waist_cm: 5 }))).status).toBe(400);
    expect((await postMeasurement(json({ date: today, body_fat_pct: 90 }))).status).toBe(400);
    expect((await postMeasurement(json({ date: today, arm_cm: "35" }))).status).toBe(400);
    expect((await postMeasurement(json({ date: "2999-01-01", waist_cm: 80 }))).status).toBe(400);
  });

  it("upserts one entry per date and lists newest first", async () => {
    await postMeasurement(json({ date: today, waist_cm: 80, chest_cm: 100 }));
    const second = await postMeasurement(json({ date: today, waist_cm: 79.5 }));
    expect((await second.json()).data).toMatchObject({ waist_cm: 79.5, chest_cm: null });

    const { data } = await (await getMeasurements()).json();
    expect(data.filter((m: { date: string }) => m.date === today)).toHaveLength(1);
    const dates = data.map((m: { date: string }) => m.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("deletes and then 404s", async () => {
    const { data } = await (await postMeasurement(json({ date: today, waist_cm: 80 }))).json();
    expect((await deleteMeasurement(new Request("http://x"), ctx(data.id))).status).toBe(200);
    expect((await deleteMeasurement(new Request("http://x"), ctx(data.id))).status).toBe(404);
  });
});
