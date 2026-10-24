import { describe, expect, it } from "vitest";
import { BUILT_IN_EXERCISES } from "@/lib/exercise-library";
import { MUSCLE_GROUPS } from "@/lib/muscles";
import type { WorkoutSet } from "@/lib/types";
import {
  computeDurationMinutes,
  formatDuration,
  formatElapsed,
  groupSetsByExercise,
  nextSetNumber,
  sessionVolume,
} from "@/lib/workout";

const set = (exercise_id: string, set_number: number, reps = 10, weight_kg = 50): WorkoutSet => ({
  id: `${exercise_id}-${set_number}`,
  session_id: "s",
  exercise_id,
  set_number,
  reps,
  weight_kg,
  rpe: null,
});

describe("computeDurationMinutes", () => {
  it("rounds to whole minutes", () => {
    expect(computeDurationMinutes("2026-10-24T10:00:00Z", "2026-10-24T11:02:29Z")).toBe(62);
    expect(computeDurationMinutes("2026-10-24T10:00:00Z", "2026-10-24T11:02:31Z")).toBe(63);
  });

  it("never returns less than one minute", () => {
    expect(computeDurationMinutes("2026-10-24T10:00:00Z", "2026-10-24T10:00:05Z")).toBe(1);
    expect(computeDurationMinutes("2026-10-24T10:00:10Z", "2026-10-24T10:00:00Z")).toBe(1);
  });
});

describe("sessionVolume", () => {
  it("sums reps times weight and ignores bodyweight sets", () => {
    expect(sessionVolume([{ reps: 10, weight_kg: 50 }, { reps: 8, weight_kg: 60 }])).toBe(980);
    expect(sessionVolume([{ reps: 12, weight_kg: 0 }])).toBe(0);
    expect(sessionVolume([])).toBe(0);
  });
});

describe("nextSetNumber", () => {
  it("counts per exercise", () => {
    const sets = [set("a", 1), set("a", 2), set("b", 1)];
    expect(nextSetNumber(sets, "a")).toBe(3);
    expect(nextSetNumber(sets, "b")).toBe(2);
    expect(nextSetNumber(sets, "c")).toBe(1);
  });
});

describe("groupSetsByExercise", () => {
  it("keeps first appearance order and sorts sets by number", () => {
    const [bench, row] = [BUILT_IN_EXERCISES[0], BUILT_IN_EXERCISES[24]];
    const groups = groupSetsByExercise(
      [set(row.id, 1), set(bench.id, 2), set(bench.id, 1), set(row.id, 2)],
      BUILT_IN_EXERCISES,
    );
    expect(groups.map((g) => g.exercise_id)).toEqual([row.id, bench.id]);
    expect(groups[1].sets.map((s) => s.set_number)).toEqual([1, 2]);
    expect(groups[0].exercise?.name).toBe(row.name);
  });

  it("tolerates unknown exercises", () => {
    expect(groupSetsByExercise([set("gone", 1)], [])[0].exercise).toBeNull();
  });
});

describe("formatting", () => {
  it("formats durations", () => {
    expect(formatDuration(42)).toBe("42m");
    expect(formatDuration(65)).toBe("1h 05m");
    expect(formatDuration(120)).toBe("2h 00m");
  });

  it("formats the live timer", () => {
    expect(formatElapsed(0)).toBe("00:00");
    expect(formatElapsed(309)).toBe("05:09");
    expect(formatElapsed(3909)).toBe("1:05:09");
    expect(formatElapsed(-5)).toBe("00:00");
  });
});

describe("exercise library", () => {
  it("has unique ids and valid muscle groups", () => {
    const ids = BUILT_IN_EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of BUILT_IN_EXERCISES) {
      expect(MUSCLE_GROUPS).toContain(e.primary_muscle);
      expect(e.secondary_muscles).not.toContain(e.primary_muscle);
      for (const m of e.secondary_muscles) expect(MUSCLE_GROUPS).toContain(m);
    }
  });

  it("covers every muscle group as a primary", () => {
    const covered = new Set(BUILT_IN_EXERCISES.map((e) => e.primary_muscle));
    expect([...covered].sort()).toEqual([...MUSCLE_GROUPS].sort());
  });
});
