import { addDays, format } from "date-fns";
import { describe, expect, it } from "vitest";
import { computeXp, levelForXp, STREAK_MILESTONES, XP_RULES, xpForLevel, type XpInput } from "@/lib/xp";

// The welcome boost has its own tests below. The rest check the plain rules, so it is left out.
const empty: XpInput = { checkins: [], weights: [], measurements: [], photos: [], sessions: [], sets: [], welcomeBoost: false };
const line = (xp: ReturnType<typeof computeXp>, source: string) => xp.lines.find((l) => l.source === source)!;

const finished = (id: string, date = "2026-10-28") => ({ id, date, ended_at: "2026-10-28T11:00:00.000Z" });
const sets = (session_id: string, n: number) => Array.from({ length: n }, () => ({ session_id }));

describe("computeXp", () => {
  it("is zero for a new account", () => {
    expect(computeXp(empty).total).toBe(0);
  });

  it("rewards gym days more than rest days", () => {
    const xp = computeXp({
      ...empty,
      checkins: [
        { date: "2026-10-26", kind: "gym" },
        { date: "2026-10-27", kind: "rest" },
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
    const xp = computeXp({ ...empty, sessions: [{ id: "w1", date: "2026-10-28", ended_at: null }], sets: sets("w1", 10) });
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
      checkins: [{ date: "2026-10-26", kind: "gym" }],
      weights: [{ date: "2026-10-26" }],
      measurements: [{ date: "2026-10-26" }],
      photos: [{ date: "2026-10-26" }],
      sessions: [finished("w1")],
      sets: sets("w1", 5),
      welcomeBoost: false,
    });
    expect(xp.total).toBe(
      XP_RULES.gymCheckin + XP_RULES.weight + XP_RULES.measurement + XP_RULES.progressPhoto + XP_RULES.workout + 5 * XP_RULES.perSet,
    );
    expect(xp.lines.reduce((sum, l) => sum + l.xp, 0)).toBe(xp.total);
  });
});

const run = (days: number, kind: "gym" | "home" | "rest" = "gym") =>
  Array.from({ length: days }, (_, i) => ({ date: format(addDays(new Date(2026, 8, 1), i), "yyyy-MM-dd"), kind }));

describe("home workouts", () => {
  it("earn XP like a check-in, a bit less than the gym", () => {
    const xp = computeXp({ ...empty, checkins: [{ date: "2026-10-26", kind: "home" }] });
    expect(line(xp, "home").xp).toBe(XP_RULES.homeCheckin);
    expect(XP_RULES.homeCheckin).toBeLessThan(XP_RULES.gymCheckin);
    expect(XP_RULES.homeCheckin).toBeGreaterThan(XP_RULES.restCheckin);
  });
});

describe("streak XP", () => {
  const streakXp = (checkins: XpInput["checkins"]) => line(computeXp({ ...empty, checkins }), "streak");

  it("is nothing below the first milestone", () => {
    expect(streakXp(run(2))).toMatchObject({ count: 0, xp: 0 });
  });

  it("pays each milestone once the run reaches it", () => {
    expect(streakXp(run(3))).toMatchObject({ count: 1, xp: 30 });
    expect(streakXp(run(7))).toMatchObject({ count: 2, xp: 30 + 70 });
    expect(streakXp(run(30)).xp).toBe(30 + 70 + 150 + 400);
  });

  it("adds every milestone for a very long run", () => {
    expect(streakXp(run(100))).toMatchObject({
      count: STREAK_MILESTONES.length,
      xp: STREAK_MILESTONES.reduce((sum, [, xp]) => sum + xp, 0),
    });
  });

  it("keeps what was earned after a streak ends, based on the best run", () => {
    const old = run(7);
    const recent = [{ date: "2026-10-20", kind: "gym" as const }, { date: "2026-10-21", kind: "gym" as const }];
    expect(streakXp([...old, ...recent])).toMatchObject({ count: 2, xp: 100 });
  });

  it("does not pay a milestone twice for rebuilding a streak", () => {
    const first = run(3);
    const second = [20, 21, 22].map((d) => ({ date: `2026-09-${d}`, kind: "gym" as const }));
    expect(streakXp([...first, ...second])).toMatchObject({ count: 1, xp: 30 });
  });

  it("counts any kind of check-in, rest days included", () => {
    expect(streakXp([...run(2, "gym"), { date: "2026-09-03", kind: "rest" }]).count).toBe(1);
  });

  it("does not break on a gap of one day", () => {
    const gap = [{ date: "2026-09-01", kind: "gym" as const }, { date: "2026-09-03", kind: "gym" as const }, { date: "2026-09-04", kind: "gym" as const }];
    expect(streakXp(gap).count).toBe(0);
  });

  it("is part of the total", () => {
    const xp = computeXp({ ...empty, checkins: run(3) });
    expect(xp.total).toBe(3 * XP_RULES.gymCheckin + 30);
  });
});

describe("levels", () => {
  it("starts at level 1 with 0 XP, in the first rank", () => {
    expect(levelForXp(0)).toMatchObject({ level: 1, intoLevel: 0, toNext: 13, progress: 0 });
    expect(levelForXp(0).rank.name).toBe("Warm-Up");
  });

  it("gives a first check-in a level straight away", () => {
    expect(levelForXp(XP_RULES.gymCheckin).level).toBeGreaterThanOrEqual(2);
  });

  it("follows the curve: level L needs (L - 1)(L + 24) / 2 XP", () => {
    const known = [[2, 13], [3, 27], [5, 58], [10, 153], [25, 588], [50, 1813], [100, 6138]] as const;
    for (const [level, xp] of known) {
      expect(xpForLevel(level)).toBe(xp);
      expect(levelForXp(xp).level).toBe(level);
      expect(levelForXp(xp - 1).level).toBe(level - 1);
    }
  });

  it("every level costs a whole number of XP and a little more than the one before", () => {
    let previous = 0;
    for (let level = 1; level < 1100; level++) {
      const cost = xpForLevel(level + 1) - xpForLevel(level);
      expect(Number.isInteger(cost)).toBe(true);
      expect(cost).toBe(12 + level);
      expect(cost).toBeGreaterThan(previous);
      previous = cost;
    }
  });

  it("round trips for every level up to 1,100", () => {
    for (let level = 1; level <= 1100; level++) {
      expect(levelForXp(xpForLevel(level)).level).toBe(level);
      if (level > 1) expect(levelForXp(xpForLevel(level) - 1).level).toBe(level - 1);
    }
  });

  it("reports progress through a level", () => {
    // Level 5 runs from 58 to 75 XP (17 XP).
    const l = levelForXp(66);
    expect(l).toMatchObject({ level: 5, intoLevel: 8, levelSpan: 17, toNext: 9 });
    expect(l.progress).toBeCloseTo(8 / 17);
  });

  it("points to the next rank and how far away it is", () => {
    const l = levelForXp(xpForLevel(5) - 10);
    expect(l.level).toBe(4);
    expect(l.nextRank?.name).toBe("Iron Rookie");
    expect(l.xpToNextRank).toBe(10);
  });

  it("has no next rank at the top", () => {
    const top = levelForXp(xpForLevel(1000));
    expect(top.rank.name).toBe("God of Gains");
    expect(top.nextRank).toBeNull();
    expect(top.xpToNextRank).toBeNull();
  });

  it("never goes below level 1 or crashes on odd input", () => {
    expect(levelForXp(-50).level).toBe(1);
    expect(levelForXp(0.9).total).toBe(0);
    expect(levelForXp(10_000_000).level).toBeGreaterThan(1000);
  });

  it("is always consistent: the level's start is at or below the XP and the next is above", () => {
    for (let xp = 0; xp < 60_000; xp += 37) {
      const { level } = levelForXp(xp);
      expect(xpForLevel(level)).toBeLessThanOrEqual(xp);
      expect(xpForLevel(level + 1)).toBeGreaterThan(xp);
    }
  });

  it("lets a regular trainer reach level 100 in a few months", () => {
    // About 420 XP a week for a 4 day a week trainer, so 14 to 15 weeks.
    const weeks = Math.ceil(xpForLevel(100) / 420);
    expect(weeks).toBeLessThanOrEqual(16);
    expect(weeks).toBeGreaterThanOrEqual(10);
  });
});
