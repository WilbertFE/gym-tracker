import { describe, expect, it } from "vitest";
import { buildDiary } from "@/lib/diary";
import { fitWithin, MAX_IMAGE_EDGE } from "@/lib/image-resize";
import type { Checkin, LogPhoto, WeightLog } from "@/lib/types";

const checkin = (id: string, date: string, went = true): Checkin => ({
  id,
  user_id: "u",
  date,
  went_to_gym: went,
  mood: null,
  energy: null,
  sleep_hours: null,
  notes: null,
});

const weight = (id: string, date: string, kg = 70): WeightLog => ({
  id,
  user_id: "u",
  date,
  weight_kg: kg,
  notes: null,
});

let n = 0;
const photo = (parent: { checkin?: string; weight?: string }, created = `2026-10-2${n % 10}T10:00:00.000Z`): LogPhoto => ({
  id: `p${n++}`,
  user_id: "u",
  checkin_id: parent.checkin ?? null,
  weight_id: parent.weight ?? null,
  storage_path: `u/log/p${n}.jpg`,
  created_at: created,
});

describe("buildDiary", () => {
  it("is empty without photos", () => {
    expect(buildDiary({ photos: [], checkins: [checkin("c1", "2026-10-20")], weights: [] })).toEqual([]);
  });

  it("groups photos by the date of their entry, newest day first", () => {
    const days = buildDiary({
      photos: [photo({ checkin: "c1" }), photo({ checkin: "c2" }), photo({ weight: "w1" })],
      checkins: [checkin("c1", "2026-10-18"), checkin("c2", "2026-10-22")],
      weights: [weight("w1", "2026-10-20")],
    });
    expect(days.map((d) => d.date)).toEqual(["2026-10-22", "2026-10-20", "2026-10-18"]);
  });

  it("joins check-in and weigh-in photos of the same day, check-in photos first", () => {
    const [day] = buildDiary({
      photos: [
        photo({ weight: "w1" }, "2026-10-20T08:00:00.000Z"),
        photo({ checkin: "c1" }, "2026-10-20T09:00:00.000Z"),
        photo({ checkin: "c1" }, "2026-10-20T07:00:00.000Z"),
      ],
      checkins: [checkin("c1", "2026-10-20")],
      weights: [weight("w1", "2026-10-20", 69.5)],
    });
    expect(day.photos.map((p) => p.source)).toEqual(["checkin", "checkin", "weight"]);
    expect(day.photos[0].created_at < day.photos[1].created_at).toBe(true); // oldest first
    expect(day.checkin?.id).toBe("c1");
    expect(day.weights.map((w) => w.weight_kg)).toEqual([69.5]);
  });

  it("lists a weigh-in once however many photos it has", () => {
    const [day] = buildDiary({
      photos: [photo({ weight: "w1" }), photo({ weight: "w1" }), photo({ weight: "w1" })],
      checkins: [],
      weights: [weight("w1", "2026-10-20")],
    });
    expect(day.weights).toHaveLength(1);
    expect(day.photos).toHaveLength(3);
    expect(day.checkin).toBeNull();
  });

  it("skips photos whose entry no longer exists", () => {
    const days = buildDiary({
      photos: [photo({ checkin: "gone" }), photo({ weight: "gone" }), photo({ checkin: "c1" })],
      checkins: [checkin("c1", "2026-10-20")],
      weights: [],
    });
    expect(days).toHaveLength(1);
    expect(days[0].photos).toHaveLength(1);
  });
});

describe("fitWithin", () => {
  it("never scales up and keeps small images unchanged", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(MAX_IMAGE_EDGE, 900)).toEqual({ width: MAX_IMAGE_EDGE, height: 900 });
  });

  it("scales a large landscape photo to the limit on the long side", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 });
  });

  it("scales a large portrait photo the same way", () => {
    expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: 1600 });
  });

  it("keeps the aspect ratio and never returns a zero size", () => {
    const { width, height } = fitWithin(100000, 10);
    expect(width).toBe(1600);
    expect(height).toBeGreaterThanOrEqual(1);
    expect(fitWithin(5, 50000)).toEqual({ width: 1, height: 1600 });
  });

  it("supports a custom maximum", () => {
    expect(fitWithin(1000, 500, 200)).toEqual({ width: 200, height: 100 });
  });
});
