import { describe, expect, it } from "vitest";
import { BUILT_IN_EXERCISES, builtInId } from "@/lib/exercise-library";
import {
  buildMuscleStats,
  INTENSITY_CONFIG,
  overallLevel,
  weeklyLevel,
} from "@/lib/muscle-intensity";
import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/muscles";
import type { Exercise, WorkoutSession, WorkoutSet } from "@/lib/types";

// Saturday. The week runs Monday 2026-10-19 to Sunday 2026-10-25.
const TODAY = "2026-10-24";

const session = (id: string, date: string): WorkoutSession => ({
  id,
  user_id: "u",
  date,
  started_at: `${date}T18:00:00.000Z`,
  ended_at: `${date}T19:00:00.000Z`,
  duration_minutes: 60,
  notes: null,
});

let n = 0;
const sets = (session_id: string, exerciseName: string, count: number): WorkoutSet[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `s${n++}`,
    session_id,
    exercise_id: builtInId(exerciseName),
    set_number: i + 1,
    reps: 8,
    weight_kg: 50,
    rpe: null,
  }));

const stats = (sessions: WorkoutSession[], allSets: WorkoutSet[], exercises: Exercise[] = BUILT_IN_EXERCISES) =>
  buildMuscleStats({ sessions, sets: allSets, exercises, today: TODAY });

const get = (result: ReturnType<typeof stats>, muscle: MuscleGroup) =>
  result.find((m) => m.muscle === muscle)!;

describe("weeklyLevel", () => {
  it("uses the configured thresholds at their boundaries", () => {
    expect(weeklyLevel(0)).toBe("none");
    expect(weeklyLevel(0.5)).toBe("low");
    expect(weeklyLevel(INTENSITY_CONFIG.weekly.lowMax)).toBe("low");
    expect(weeklyLevel(INTENSITY_CONFIG.weekly.lowMax + 0.5)).toBe("mid");
    expect(weeklyLevel(INTENSITY_CONFIG.weekly.midMax)).toBe("mid");
    expect(weeklyLevel(INTENSITY_CONFIG.weekly.midMax + 0.5)).toBe("high");
  });

  it("matches the README starting point: 1 to 5 low, 6 to 12 mid, 13 or more high", () => {
    expect([1, 5].map(weeklyLevel)).toEqual(["low", "low"]);
    expect([6, 12].map(weeklyLevel)).toEqual(["mid", "mid"]);
    expect([13, 40].map(weeklyLevel)).toEqual(["high", "high"]);
  });
});

describe("overallLevel", () => {
  it("is relative to the most trained muscle", () => {
    expect(overallLevel(100, 100)).toBe("high");
    expect(overallLevel(67, 100)).toBe("high");
    expect(overallLevel(66, 100)).toBe("mid");
    expect(overallLevel(34, 100)).toBe("mid");
    expect(overallLevel(33, 100)).toBe("low");
    expect(overallLevel(1, 100)).toBe("low");
    expect(overallLevel(0, 100)).toBe("none");
  });

  it("is none when nothing has been trained", () => {
    expect(overallLevel(0, 0)).toBe("none");
  });
});

describe("buildMuscleStats", () => {
  it("returns all 16 muscle groups, untrained with no data", () => {
    const result = stats([], []);
    expect(result.map((m) => m.muscle)).toEqual([...MUSCLE_GROUPS]);
    for (const m of result) {
      expect(m.weekly).toMatchObject({ score: 0, level: "none", topExercises: [] });
      expect(m.overall).toMatchObject({ score: 0, level: "none" });
      expect(m.lastTrainedDaysAgo).toBeNull();
    }
  });

  it("weights primary sets 1.0 and secondary sets 0.5", () => {
    // Bench press: chest primary, front delts and triceps secondary.
    const result = stats([session("a", "2026-10-20")], sets("a", "Barbell Bench Press", 4));
    expect(get(result, "chest").weekly.score).toBe(4);
    expect(get(result, "front_delts").weekly.score).toBe(2);
    expect(get(result, "triceps").weekly.score).toBe(2);
    expect(get(result, "biceps").weekly.score).toBe(0);
  });

  it("adds contributions from several exercises", () => {
    // Dips: triceps primary, chest and front delts secondary.
    const result = stats(
      [session("a", "2026-10-20")],
      [...sets("a", "Barbell Bench Press", 4), ...sets("a", "Dips", 3)],
    );
    expect(get(result, "chest").weekly.score).toBe(4 + 1.5);
    expect(get(result, "triceps").weekly.score).toBe(2 + 3);
    expect(get(result, "chest").weekly.topExercises).toEqual([
      { name: "Barbell Bench Press", sets: 4 },
      { name: "Dips", sets: 3 },
    ]);
  });

  it("limits the weekly period to Monday through Sunday", () => {
    const result = stats(
      [
        session("this", "2026-10-19"), // Monday, included
        session("sun", "2026-10-25"), // Sunday, included
        session("last", "2026-10-18"), // previous Sunday, excluded
        session("next", "2026-10-26"), // next Monday, excluded
      ],
      [
        ...sets("this", "Barbell Curl", 2),
        ...sets("sun", "Barbell Curl", 3),
        ...sets("last", "Barbell Curl", 10),
        ...sets("next", "Barbell Curl", 10),
      ],
    );
    expect(get(result, "biceps").weekly.score).toBe(5);
    expect(get(result, "biceps").overall.score).toBe(25);
  });

  it("normalises overall levels against the user's own most trained muscle", () => {
    const result = stats(
      [session("a", "2026-09-01")],
      [...sets("a", "Barbell Curl", 30), ...sets("a", "Lateral Raise", 12), ...sets("a", "Wrist Curl", 3)],
    );
    // Biceps 30 (max), side delts 12 (40%), forearms 3 + 15 secondary = 18 (60%).
    expect(get(result, "biceps").overall.level).toBe("high");
    expect(get(result, "side_delts").overall.level).toBe("mid");
    expect(get(result, "forearms").overall.score).toBe(18);
    expect(get(result, "forearms").overall.level).toBe("mid");
    expect(get(result, "chest").overall.level).toBe("none");
    // Old sets do not count toward the weekly view.
    expect(get(result, "biceps").weekly.level).toBe("none");
  });

  it("reports days since a muscle was last worked, secondary work included", () => {
    const result = stats(
      [session("old", "2026-10-10"), session("new", "2026-10-22")],
      [...sets("old", "Barbell Bench Press", 3), ...sets("new", "Dips", 3)],
    );
    expect(get(result, "triceps").lastTrainedDaysAgo).toBe(2);
    expect(get(result, "chest").lastTrainedDaysAgo).toBe(2);
    expect(get(result, "front_delts").lastTrainedDaysAgo).toBe(2);
    expect(get(result, "calves").lastTrainedDaysAgo).toBeNull();
  });

  it("ignores sets whose session or exercise is unknown", () => {
    const orphan: WorkoutSet = { ...sets("ghost", "Barbell Curl", 1)[0] };
    const unknownExercise: WorkoutSet = { ...sets("a", "Barbell Curl", 1)[0], exercise_id: "nope" };
    const result = stats([session("a", "2026-10-20")], [orphan, unknownExercise]);
    expect(get(result, "biceps").overall.score).toBe(0);
  });

  it("suggests exercises for the muscle, favouring the ones used", () => {
    const result = stats(
      [session("a", "2026-10-20")],
      [...sets("a", "Incline Dumbbell Curl", 5), ...sets("a", "Barbell Curl", 2)],
    );
    const suggestions = get(result, "biceps").suggestions;
    expect(suggestions).toHaveLength(3);
    expect(suggestions[0]).toBe("Incline Dumbbell Curl");
    expect(suggestions[1]).toBe("Barbell Curl");
  });

  it("works with custom exercises", () => {
    const custom: Exercise = {
      id: "custom-1",
      user_id: "u",
      name: "Zottman Curl",
      primary_muscle: "biceps",
      secondary_muscles: ["forearms", "biceps"],
      equipment: null,
    };
    const result = stats(
      [session("a", "2026-10-20")],
      [{ ...sets("a", "Barbell Curl", 1)[0], exercise_id: "custom-1" }],
      [...BUILT_IN_EXERCISES, custom],
    );
    // The primary muscle listed again as secondary is not double counted.
    expect(get(result, "biceps").weekly.score).toBe(1);
    expect(get(result, "forearms").weekly.score).toBe(0.5);
  });
});
