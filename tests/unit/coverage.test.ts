import { describe, expect, it } from "vitest";
import { coverageDelta, coverageMessage, weeklyCoverage, workedMuscles } from "@/lib/coverage";
import { BUILT_IN_EXERCISES, builtInId } from "@/lib/exercise-library";
import { buildMuscleStats, formatScore, weeklyLevel, type MuscleStat } from "@/lib/muscle-intensity";
import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/muscles";
import type { WorkoutSession, WorkoutSet } from "@/lib/types";

function stat(muscle: MuscleGroup, weekly: number, daysAgo: number | null): MuscleStat {
  const none = { topExercises: [] };
  return {
    muscle,
    weekly: { score: weekly, level: weeklyLevel(weekly), ...none },
    overall: { score: weekly, level: "low", ...none },
    lastTrainedDaysAgo: daysAgo,
    suggestions: [],
  };
}

const session = (date: string): WorkoutSession => ({
  id: "s",
  user_id: "u",
  date,
  started_at: `${date}T18:00:00.000Z`,
  ended_at: null,
  duration_minutes: null,
  notes: null,
});

const setsOf = (name: string, count: number): WorkoutSet[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `x${name}${i}`,
    session_id: "s",
    exercise_id: builtInId(name),
    set_number: i + 1,
    reps: 8,
    weight_kg: 20,
    rpe: null,
    completed_at: "2026-10-24T10:00:00.000Z",
  }));

describe("weeklyCoverage", () => {
  it("counts muscles with any work this week", () => {
    const stats = MUSCLE_GROUPS.map((m, i) => stat(m, i < 5 ? 3 : 0, i < 5 ? 1 : null));
    const c = weeklyCoverage(stats);
    expect(c).toMatchObject({ trained: 5, total: 16, percent: 31 });
    expect(c.untrained).toHaveLength(11);
  });

  it("counts a half set (secondary work) as trained", () => {
    const c = weeklyCoverage([stat("forearms", 0.5, 1), stat("abs", 0, 4)]);
    expect(c.trained).toBe(1);
    expect(c.untrained.map((u) => u.muscle)).toEqual(["abs"]);
  });

  it("lists never trained muscles first, then the longest wait", () => {
    const c = weeklyCoverage([
      stat("calves", 0, 3),
      stat("abs", 0, null),
      stat("traps", 0, 12),
      stat("obliques", 0, null),
      stat("lats", 4, 0),
    ]);
    expect(c.untrained.map((u) => u.muscle)).toEqual(["abs", "obliques", "traps", "calves"]);
    expect(c.untrained[0].daysAgo).toBeNull();
    expect(c.untrained[2].daysAgo).toBe(12);
  });

  it("is 0 percent with no work and 100 percent with every group trained", () => {
    expect(weeklyCoverage(MUSCLE_GROUPS.map((m) => stat(m, 0, null))).percent).toBe(0);
    const full = weeklyCoverage(MUSCLE_GROUPS.map((m) => stat(m, 2, 0)));
    expect(full).toMatchObject({ trained: 16, percent: 100, untrained: [] });
  });

  it("works with real stats: one bench session trains chest, front delts and triceps", () => {
    const stats = buildMuscleStats({
      sessions: [session("2026-10-22")],
      sets: setsOf("Barbell Bench Press", 3),
      exercises: BUILT_IN_EXERCISES,
      today: "2026-10-24",
    });
    const c = weeklyCoverage(stats);
    expect(c.trained).toBe(3);
    expect(c.untrained.map((u) => u.muscle)).not.toContain("chest");
    expect(c.untrained).toHaveLength(13);
  });

  it("compares with last week by running the same week range a week earlier", () => {
    // 14 October is in the week of Monday 12 to Sunday 18 October.
    const input = {
      sessions: [session("2026-10-14")],
      sets: setsOf("Barbell Curl", 1),
      exercises: BUILT_IN_EXERCISES,
    };
    const thisWeek = weeklyCoverage(buildMuscleStats({ ...input, today: "2026-10-24" }));
    const lastWeek = weeklyCoverage(buildMuscleStats({ ...input, today: "2026-10-17" }));
    expect(thisWeek.trained).toBe(0);
    expect(lastWeek.trained).toBe(2); // biceps, plus forearms as a secondary
  });
});

describe("workedMuscles", () => {
  it("lists what a workout trained, most sets first", () => {
    const stats = buildMuscleStats({
      sessions: [session("2026-10-24")],
      sets: [...setsOf("Barbell Bench Press", 4), ...setsOf("Tricep Pushdown", 2)],
      exercises: BUILT_IN_EXERCISES,
      today: "2026-10-24",
    });
    // Bench: chest 4, front delts 2, triceps 2. Pushdown: triceps 2. Triceps total 4.
    expect(workedMuscles(stats)).toEqual([
      { muscle: "chest", sets: 4 },
      { muscle: "triceps", sets: 4 },
      { muscle: "front_delts", sets: 2 },
    ]);
  });

  it("is empty before any set is logged", () => {
    const stats = buildMuscleStats({
      sessions: [session("2026-10-24")],
      sets: [],
      exercises: BUILT_IN_EXERCISES,
      today: "2026-10-24",
    });
    expect(workedMuscles(stats)).toEqual([]);
  });

  it("counts only the given workout, not the rest of the week", () => {
    const other: WorkoutSession = { ...session("2026-10-21"), id: "other" };
    const otherSets = setsOf("Barbell Curl", 6).map((s) => ({ ...s, id: `o-${s.id}`, session_id: "other" }));
    const mine = buildMuscleStats({
      sessions: [session("2026-10-24")],
      sets: setsOf("Lateral Raise", 3),
      exercises: BUILT_IN_EXERCISES,
      today: "2026-10-24",
    });
    const week = buildMuscleStats({
      sessions: [session("2026-10-24"), other],
      sets: [...setsOf("Lateral Raise", 3), ...otherSets],
      exercises: BUILT_IN_EXERCISES,
      today: "2026-10-24",
    });
    expect(workedMuscles(mine).map((w) => w.muscle)).toEqual(["side_delts"]);
    expect(workedMuscles(mine).map((w) => w.muscle)).not.toContain("biceps");
    // The week view includes both, so the coverage is larger than the workout alone.
    expect(weeklyCoverage(week).trained).toBeGreaterThan(weeklyCoverage(mine).trained);
  });
});

describe("formatScore", () => {
  it("drops the decimal point on whole numbers", () => {
    expect(formatScore(4)).toBe("4");
    expect(formatScore(0)).toBe("0");
    expect(formatScore(2.5)).toBe("2.5");
    expect(formatScore(3.25)).toBe("3.3");
  });
});

describe("coverageMessage", () => {
  it("encourages a fresh week", () => {
    expect(coverageMessage({ trained: 0, total: 16 })).toBe("Fresh week. Start a workout to light up the map.");
  });

  it("counts down in the first half", () => {
    expect(coverageMessage({ trained: 3, total: 16 })).toBe("3 down, 13 to go.");
    expect(coverageMessage({ trained: 7, total: 16 })).toBe("7 down, 9 to go.");
  });

  it("says almost there past halfway, with singular and plural", () => {
    expect(coverageMessage({ trained: 8, total: 16 })).toBe("Almost there. Only 8 groups left.");
    expect(coverageMessage({ trained: 15, total: 16 })).toBe("Almost there. Only 1 group left.");
  });

  it("celebrates full coverage", () => {
    expect(coverageMessage({ trained: 16, total: 16 })).toBe("Every muscle group trained this week. Great work.");
  });
});

describe("coverageDelta", () => {
  it("signs the change against last week", () => {
    expect(coverageDelta(9, 6)).toBe("+3 vs last week");
    expect(coverageDelta(4, 7)).toBe("-3 vs last week");
    expect(coverageDelta(5, 5)).toBe("Same as last week");
  });
});
