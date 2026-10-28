import { describe, expect, it } from "vitest";
import { guideDone, guideSteps } from "@/lib/guide";
import { boostersEarned } from "@/lib/boosters";
import { FEATURES, featureById, isUnlocked, nextUnlockLevel, nextUnlocks, unlockedBetween } from "@/lib/unlocks";
import { levelForXp, xpForLevel } from "@/lib/xp";

describe("the unlock table", () => {
  it("never goes down in level, and every feature has a unique id and a way to reach it", () => {
    for (let i = 1; i < FEATURES.length; i++) expect(FEATURES[i].level).toBeGreaterThanOrEqual(FEATURES[i - 1].level);
    expect(new Set(FEATURES.map((f) => f.id)).size).toBe(FEATURES.length);
    for (const f of FEATURES) {
      expect(f.level).toBeGreaterThan(1);
      expect(f.href).toMatch(/^\//);
      expect(`${f.name} ${f.blurb}`).not.toContain("—");
    }
  });

  it("keeps the first day simple: a single workout does not open everything", () => {
    // A check-in, a workout of 10 sets, a weigh-in and the quests of day one add up to roughly 130 XP.
    const firstDay = levelForXp(130).level;
    expect(firstDay).toBeLessThan(FEATURES.at(-1)!.level);
    expect(FEATURES.filter((f) => f.level <= firstDay).length).toBeLessThan(FEATURES.length);
  });

  it("opens each feature at its level, and not before", () => {
    for (const f of FEATURES) {
      expect(isUnlocked(f.id, f.level)).toBe(true);
      expect(isUnlocked(f.id, f.level - 1)).toBe(false);
      expect(isUnlocked(f.id, f.level + 50)).toBe(true);
    }
  });

  it("opens everything with show all", () => {
    for (const f of FEATURES) expect(isUnlocked(f.id, 1, true)).toBe(true);
  });

  it("lists what is next, soonest first, and at most the count asked", () => {
    expect(nextUnlocks(1).map((f) => f.id)).toEqual(["quests", "boosters"]);
    expect(nextUnlocks(5, 1)[0].id).toBe("status");
    expect(nextUnlocks(1, 5)).toHaveLength(5);
    expect(nextUnlocks(99)).toEqual([]);
  });

  it("finds the next unlock level, or none", () => {
    expect(nextUnlockLevel(1)).toBe(5);
    expect(nextUnlockLevel(5)).toBe(8);
    expect(nextUnlockLevel(15)).toBeNull();
  });

  it("says what opened between two levels, for the unlock message", () => {
    expect(unlockedBetween(1, 4)).toEqual([]);
    expect(unlockedBetween(4, 8).map((f) => f.id)).toEqual(["quests", "boosters", "status"]);
    expect(unlockedBetween(8, 8)).toEqual([]);
    expect(unlockedBetween(14, 20).map((f) => f.id)).toEqual(["muscleLevels", "trials"]);
  });

  it("can reach a unique feature by id", () => {
    expect(featureById("leaderboard").level).toBe(10);
  });

  it("is reachable with real XP: the first unlock needs little, the last a few weeks", () => {
    expect(xpForLevel(5)).toBeLessThan(100);
    expect(xpForLevel(15)).toBeLessThan(500);
  });
});

describe("the getting started guide", () => {
  const empty = { checkins: [], weights: [], sessions: [], sets: [] };
  const finished = { id: "w", ended_at: "2026-10-28T11:00:00.000Z" };
  const sets = (n: number) => Array.from({ length: n }, () => ({ session_id: "w" }));

  it("has four steps, none done for a new account", () => {
    const steps = guideSteps(empty);
    expect(steps.map((s) => s.id)).toEqual(["checkin", "firstSet", "firstWorkout", "weight"]);
    expect(steps.every((s) => !s.done)).toBe(true);
    expect(guideDone(steps)).toBe(false);
  });

  it("ticks each step from what was done", () => {
    expect(guideSteps({ ...empty, checkins: [{ date: "2026-10-28" }] })[0].done).toBe(true);
    expect(guideSteps({ ...empty, sessions: [{ id: "w", ended_at: null }], sets: sets(1) })[1].done).toBe(true);
    expect(guideSteps({ ...empty, weights: [{ date: "2026-10-28" }] })[3].done).toBe(true);
  });

  it("counts a first workout only when finished with enough sets", () => {
    expect(guideSteps({ ...empty, sessions: [finished], sets: sets(2) })[2].done).toBe(false);
    expect(guideSteps({ ...empty, sessions: [{ id: "w", ended_at: null }], sets: sets(5) })[2].done).toBe(false);
    expect(guideSteps({ ...empty, sessions: [finished], sets: sets(3) })[2].done).toBe(true);
  });

  it("is done only when every step is", () => {
    const all = guideSteps({ checkins: [{ date: "d" }], weights: [{ date: "d" }], sessions: [finished], sets: sets(3) });
    expect(guideDone(all)).toBe(true);
  });

  it("gives every step a hint and a place to go, with no em dash", () => {
    for (const s of guideSteps(empty)) {
      expect(s.hint.length).toBeGreaterThan(5);
      expect(s.href).toMatch(/^\//);
      expect(`${s.title} ${s.hint}`).not.toContain("—");
    }
  });

  it("earns a booster when finished", () => {
    expect(boostersEarned({ workouts: 0, longestStreak: 0 }).total).toBe(0);
    const done = boostersEarned({ workouts: 0, longestStreak: 0, guideDone: true });
    expect(done.total).toBe(1);
    expect(done.sources.map((s) => s.label)).toEqual(["The getting started guide"]);
    expect(boostersEarned({ workouts: 1, longestStreak: 0, guideDone: true }).total).toBe(2);
  });
});
