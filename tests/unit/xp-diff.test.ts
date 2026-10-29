import { describe, expect, it } from "vitest";
import { rankForLevel } from "@/lib/ranks";
import { affectsXp, diffXp, levelsGained, mergeGains, type XpSnapshot } from "@/lib/xp-diff";
import { levelForXp } from "@/lib/xp";

const snapshot = (total: number, lines: Record<string, number> = {}, userId = "u1"): XpSnapshot => {
  const l = levelForXp(total);
  return {
    userId,
    total,
    level: l.level,
    progress: l.progress,
    rank: l.rank,
    lines: Object.entries(lines).map(([source, xp]) => ({ source, label: source.toUpperCase(), xp })),
  };
};

describe("diffXp", () => {
  it("is nothing without a starting point", () => {
    expect(diffXp(null, snapshot(100))).toBeNull();
  });

  it("is nothing when XP did not change", () => {
    expect(diffXp(snapshot(100), snapshot(100))).toBeNull();
  });

  it("is nothing when XP went down, such as after a delete", () => {
    expect(diffXp(snapshot(100, { gym: 100 }), snapshot(80, { gym: 80 }))).toBeNull();
  });

  it("is nothing for a different user", () => {
    expect(diffXp(snapshot(10, {}, "u1"), snapshot(50, {}, "u2"))).toBeNull();
  });

  it("names what was gained, biggest first, and ignores sources that did not move", () => {
    const gain = diffXp(
      snapshot(100, { gym: 20, weight: 10, workout: 0 }),
      snapshot(170, { gym: 40, weight: 10, workout: 40, sets: 10 }),
    )!;
    expect(gain.gained).toBe(70);
    expect(gain.items).toEqual([
      { label: "WORKOUT", xp: 40 },
      { label: "GYM", xp: 20 },
      { label: "SETS", xp: 10 },
    ]);
  });

  it("reports where the bar starts and ends", () => {
    const gain = diffXp(snapshot(60), snapshot(66))!;
    expect(gain.from.level).toBe(gain.to.level);
    expect(gain.to.progress).toBeGreaterThan(gain.from.progress);
    expect(gain.leveledUp).toBe(false);
    expect(gain.rankedUp).toBe(false);
  });

  it("flags a level up, including several levels at once", () => {
    const one = diffXp(snapshot(12), snapshot(14))!;
    expect(one.leveledUp).toBe(true);
    expect(levelsGained(one)).toBe(1);

    const many = diffXp(snapshot(0), snapshot(100))!;
    expect(many.leveledUp).toBe(true);
    expect(levelsGained(many)).toBeGreaterThan(3);
  });

  it("flags a new rank only when the rank changes", () => {
    // Level 5 starts Iron Rookie at 58 XP.
    const up = diffXp(snapshot(55), snapshot(60))!;
    expect(up.rankedUp).toBe(true);
    expect(up.rank.name).toBe("Iron Rookie");
    expect(diffXp(snapshot(20), snapshot(30))!.rankedUp).toBe(false);
  });
});

describe("mergeGains", () => {
  it("adds two gains into one that spans both", () => {
    const a = diffXp(snapshot(10, { gym: 10 }), snapshot(30, { gym: 30 }))!;
    const b = diffXp(snapshot(30, { gym: 30 }), snapshot(40, { gym: 30, sets: 10 }))!;
    const merged = mergeGains(a, b);
    expect(merged.gained).toBe(30);
    expect(merged.items).toEqual([
      { label: "GYM", xp: 20 },
      { label: "SETS", xp: 10 },
    ]);
    expect(merged.from).toEqual(a.from);
    expect(merged.to).toEqual(b.to);
  });

  it("adds up the same source and keeps a level up from either part", () => {
    const a = diffXp(snapshot(10, { sets: 0 }), snapshot(12, { sets: 2 }))!;
    const b = diffXp(snapshot(12, { sets: 2 }), snapshot(14, { sets: 4 }))!;
    const merged = mergeGains(a, b);
    expect(merged.items).toEqual([{ label: "SETS", xp: 4 }]);
    expect(merged.leveledUp).toBe(true);
  });

  it("keeps a rank up that happened in the first part", () => {
    const a = diffXp(snapshot(55), snapshot(60))!;
    const b = diffXp(snapshot(60), snapshot(62))!;
    expect(mergeGains(a, b).rankedUp).toBe(true);
    expect(mergeGains(a, b).rank).toEqual(rankForLevel(5));
  });
});

describe("affectsXp", () => {
  it.each([
    "/api/checkins",
    "/api/checkins/abc",
    "/api/weights",
    "/api/weights/abc",
    "/api/photos",
    "/api/workouts/abc/finish",
    "/api/workouts/abc/sets",
    "/api/workouts/abc/sets/def",
    "/api/workouts/abc",
    "/api/checkins?x=1",
  ])("%s can change XP", (url) => {
    expect(affectsXp(url)).toBe(true);
  });

  it.each(["/api/workouts", "/api/settings", "/api/membership", "/api/availability", "/api/log-photos", "/api/xp", "/api/exercises"])(
    "%s cannot",
    (url) => {
      expect(affectsXp(url)).toBe(false);
    },
  );
});
