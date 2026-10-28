import { describe, expect, it } from "vitest";
import { computeXp, levelForXp, titleForLevel, XP_RULES, xpForLevel, type XpInput } from "@/lib/xp";

const empty: XpInput = { checkins: [], weights: [], measurements: [], photos: [], sessions: [], sets: [] };
const line = (xp: ReturnType<typeof computeXp>, source: string) => xp.lines.find((l) => l.source === source)!;

const finished = (id: string) => ({ id, ended_at: "2026-10-28T11:00:00.000Z" });
const sets = (session_id: string, n: number) => Array.from({ length: n }, () => ({ session_id }));

describe("computeXp", () => {
  it("is zero for a new account", () => {
    expect(computeXp(empty).total).toBe(0);
  });

  it("rewards gym days more than rest days", () => {
    const xp = computeXp({
      ...empty,
      checkins: [
        { date: "2026-10-26", went_to_gym: true },
        { date: "2026-10-27", went_to_gym: false },
      ],
    });
    expect(line(xp, "gym").xp).toBe(XP_RULES.gymCheckin);
    expect(line(xp, "rest").xp).toBe(XP_RULES.restCheckin);
    expect(xp.total).toBe(XP_RULES.gymCheckin + XP_RULES.restCheckin);
  });

  it("gives daily things one reward per day", () => {
    const xp = computeXp({
      ...empty,
      weights: [{ date: "2026-10-26" }, { date: "2026-10-26" }, { date: "2026-10-27" }],
      measurements: [{ date: "2026-10-26" }, { date: "2026-10-26" }],
      photos: [{ date: "2026-10-26" }, { date: "2026-10-26" }, { date: "2026-10-26" }],
    });
    expect(line(xp, "weight").count).toBe(2);
    expect(line(xp, "measurement").count).toBe(1);
    expect(line(xp, "photo").count).toBe(1);
  });

  it("counts a finished workout with enough sets, plus its sets", () => {
    const xp = computeXp({ ...empty, sessions: [finished("w1")], sets: sets("w1", 10) });
    expect(line(xp, "workout").xp).toBe(XP_RULES.workout);
    expect(line(xp, "sets").xp).toBe(10 * XP_RULES.perSet);
  });

  it("ignores a workout still in progress", () => {
    const xp = computeXp({ ...empty, sessions: [{ id: "w1", ended_at: null }], sets: sets("w1", 10) });
    expect(xp.total).toBe(0);
  });

  it("ignores a workout with too few sets, so start and finish farming pays nothing", () => {
    const xp = computeXp({ ...empty, sessions: [finished("w1")], sets: sets("w1", XP_RULES.minSetsForWorkout - 1) });
    expect(xp.total).toBe(0);
  });

  it("caps the rewarded sets in one workout", () => {
    const xp = computeXp({ ...empty, sessions: [finished("w1")], sets: sets("w1", 100) });
    expect(line(xp, "sets").count).toBe(XP_RULES.maxRewardedSets);
  });

  it("totals every source", () => {
    const xp = computeXp({
      checkins: [{ date: "2026-10-26", went_to_gym: true }],
      weights: [{ date: "2026-10-26" }],
      measurements: [{ date: "2026-10-26" }],
      photos: [{ date: "2026-10-26" }],
      sessions: [finished("w1")],
      sets: sets("w1", 5),
    });
    expect(xp.total).toBe(
      XP_RULES.gymCheckin + XP_RULES.weight + XP_RULES.measurement + XP_RULES.progressPhoto + XP_RULES.workout + 5 * XP_RULES.perSet,
    );
    expect(xp.lines.reduce((sum, l) => sum + l.xp, 0)).toBe(xp.total);
  });
});

describe("levels", () => {
  it("starts at level 1 with 0 XP", () => {
    expect(levelForXp(0)).toMatchObject({ level: 1, title: "Rookie", intoLevel: 0, toNext: 100, progress: 0 });
  });

  it("follows the curve at and around each boundary", () => {
    const boundaries = [[2, 100], [3, 300], [4, 600], [5, 1000], [10, 4500]] as const;
    for (const [level, xp] of boundaries) {
      expect(xpForLevel(level)).toBe(xp);
      expect(levelForXp(xp).level).toBe(level);
      expect(levelForXp(xp - 1).level).toBe(level - 1);
    }
  });

  it("reports progress through a level", () => {
    // Level 2 runs from 100 to 300 XP.
    const l = levelForXp(200);
    expect(l).toMatchObject({ level: 2, intoLevel: 100, levelSpan: 200, toNext: 100 });
    expect(l.progress).toBeCloseTo(0.5);
  });

  it("never goes below level 1 or crashes on odd input", () => {
    expect(levelForXp(-50).level).toBe(1);
    expect(levelForXp(0.9).total).toBe(0);
    expect(levelForXp(10_000_000).level).toBeGreaterThan(100);
  });

  it("gets a new title at the thresholds", () => {
    expect(titleForLevel(1)).toBe("Rookie");
    expect(titleForLevel(4)).toBe("Rookie");
    expect(titleForLevel(5)).toBe("Regular");
    expect(titleForLevel(10)).toBe("Committed");
    expect(titleForLevel(30)).toBe("Legend");
  });

  it("is always consistent: the level's start is at or below the XP and the next is above", () => {
    for (let xp = 0; xp < 20_000; xp += 37) {
      const { level } = levelForXp(xp);
      expect(xpForLevel(level)).toBeLessThanOrEqual(xp);
      expect(xpForLevel(level + 1)).toBeGreaterThan(xp);
    }
  });
});
