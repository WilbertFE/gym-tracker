import { describe, expect, it } from "vitest";
import { BUILT_IN_EXERCISES, builtInId } from "@/lib/exercise-library";
import {
  buildMuscleStats,
  weeklyLevel,
  type MuscleStat,
} from "@/lib/muscle-intensity";
import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/muscles";
import { recommendUndertrained } from "@/lib/recommendations";
import type { WorkoutSession, WorkoutSet } from "@/lib/types";

function stat(
  muscle: MuscleGroup,
  weekly: number,
  daysAgo: number | null,
  overall = weekly,
): MuscleStat {
  const empty = { topExercises: [] };
  return {
    muscle,
    weekly: { score: weekly, level: weeklyLevel(weekly), ...empty },
    overall: { score: overall, level: "low", ...empty },
    lastTrainedDaysAgo: daysAgo,
    suggestions: [`${muscle} exercise`],
  };
}

describe("recommendUndertrained", () => {
  it("returns nothing when every muscle is at least moderate", () => {
    const stats = MUSCLE_GROUPS.map((m) => stat(m, 8, 1));
    expect(recommendUndertrained(stats)).toEqual([]);
  });

  it("only includes untrained or light muscles", () => {
    const stats = [stat("chest", 8, 1), stat("lats", 3, 2), stat("quads", 0, 9), stat("abs", 15, 0)];
    expect(recommendUndertrained(stats).map((r) => r.muscle)).toEqual(["quads", "lats"]);
  });

  it("orders by fewest weekly sets, then longest since last trained", () => {
    const stats = [
      stat("biceps", 0, 3),
      stat("calves", 0, 12),
      stat("forearms", 0, null), // never trained counts as the longest wait
      stat("abs", 2, 20),
      stat("glutes", 1, 1),
    ];
    expect(recommendUndertrained(stats, 10).map((r) => r.muscle)).toEqual([
      "forearms",
      "calves",
      "biceps",
      "glutes",
      "abs",
    ]);
  });

  it("breaks remaining ties by all time sets, then by muscle order", () => {
    const stats = [stat("traps", 0, 5, 40), stat("obliques", 0, 5, 10), stat("lats", 0, 5, 10)];
    expect(recommendUndertrained(stats, 10).map((r) => r.muscle)).toEqual(["traps", "obliques", "lats"].sort(
      (a, b) => {
        const rank = (m: string) => (m === "traps" ? 2 : m === "obliques" ? 0 : 1);
        return rank(a) - rank(b);
      },
    ));
  });

  it("respects the limit, defaulting to four", () => {
    const stats = MUSCLE_GROUPS.map((m) => stat(m, 0, 5));
    expect(recommendUndertrained(stats)).toHaveLength(4);
    expect(recommendUndertrained(stats, 2)).toHaveLength(2);
  });

  it("explains each recommendation and how many sets reach moderate", () => {
    const stats = [stat("quads", 0, 9), stat("lats", 3.5, 1), stat("abs", 0, null), stat("calves", 5, 0)];
    const byMuscle = Object.fromEntries(recommendUndertrained(stats, 10).map((r) => [r.muscle, r]));

    expect(byMuscle.quads.reason).toBe("No sets this week, last trained 9 days ago.");
    expect(byMuscle.quads.setsToModerate).toBe(6);
    expect(byMuscle.abs.reason).toBe("No sets this week, never trained.");
    expect(byMuscle.lats.reason).toBe("3.5 weighted sets this week, last trained yesterday.");
    expect(byMuscle.lats.setsToModerate).toBe(3);
    expect(byMuscle.calves.reason).toBe("5 weighted sets this week, trained today.");
    expect(byMuscle.calves.setsToModerate).toBe(1);
    expect(byMuscle.quads.exercises).toEqual(["quads exercise"]);
  });

  it("uses singular wording for exactly one weighted set", () => {
    expect(recommendUndertrained([stat("abs", 1, 2)])[0].reason).toBe(
      "1 weighted set this week, last trained 2 days ago.",
    );
  });

  it("works end to end with real muscle stats", () => {
    // Saturday 2026-10-24. Only the Thursday push day happened this week.
    const sessions: WorkoutSession[] = [
      {
        id: "s",
        user_id: "u",
        date: "2026-10-22",
        started_at: "2026-10-22T18:00:00.000Z",
        ended_at: "2026-10-22T19:00:00.000Z",
        duration_minutes: 60,
        notes: null,
      },
    ];
    const sets: WorkoutSet[] = Array.from({ length: 8 }, (_, i) => ({
      id: `set${i}`,
      session_id: "s",
      exercise_id: builtInId("Barbell Bench Press"),
      set_number: i + 1,
      reps: 8,
      weight_kg: 60,
      rpe: null,
      completed_at: "2026-10-24T10:00:00.000Z",
    }));
    const stats = buildMuscleStats({ sessions, sets, exercises: BUILT_IN_EXERCISES, today: "2026-10-24" });
    const recs = recommendUndertrained(stats, 16);
    const muscles = recs.map((r) => r.muscle);

    expect(muscles).not.toContain("chest"); // 8 sets, moderate
    expect(muscles).toContain("quads");
    expect(muscles).toContain("lats");
    expect(recs.find((r) => r.muscle === "quads")?.exercises.length).toBeGreaterThan(0);
  });
});
