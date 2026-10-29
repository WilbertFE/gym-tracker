import { MUSCLE_GROUPS, MUSCLE_LABELS, type MuscleGroup } from "@/lib/muscles";
import type { Exercise, WorkoutSet } from "@/lib/types";

/**
 * Every muscle has a level of its own, from all the sets that have worked it. A primary set counts a full
 * set and a secondary one half, the same weighting as the heatmap. Level L needs 2 (L - 1) squared weighted
 * sets: level 2 at 2, level 3 at 8, level 5 at 32, level 10 at 162. Worked out from the logged sets, so
 * deleting sets lowers it and nothing is stored.
 */
export const setsForMuscleLevel = (level: number): number => 2 * (level - 1) ** 2;

export const levelForWeightedSets = (weighted: number): number => 1 + Math.floor(Math.sqrt(Math.max(0, weighted) / 2));

export type MuscleLevel = {
  muscle: MuscleGroup;
  label: string;
  /** Weighted sets, primary 1 and secondary 0.5. */
  weighted: number;
  level: number;
  /** 0 to 1 through the current level. */
  progress: number;
  /** Weighted sets still needed for the next level. */
  toNext: number;
};

export function muscleLevels(
  sets: Pick<WorkoutSet, "exercise_id">[],
  exercises: Pick<Exercise, "id" | "primary_muscle" | "secondary_muscles">[],
): MuscleLevel[] {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const score = new Map<MuscleGroup, number>();
  for (const set of sets) {
    const exercise = byId.get(set.exercise_id);
    if (!exercise) continue;
    score.set(exercise.primary_muscle, (score.get(exercise.primary_muscle) ?? 0) + 1);
    for (const m of exercise.secondary_muscles) score.set(m, (score.get(m) ?? 0) + 0.5);
  }

  return MUSCLE_GROUPS.map((muscle) => {
    const weighted = score.get(muscle) ?? 0;
    const level = levelForWeightedSets(weighted);
    const start = setsForMuscleLevel(level);
    const next = setsForMuscleLevel(level + 1);
    return {
      muscle,
      label: MUSCLE_LABELS[muscle],
      weighted,
      level,
      progress: (weighted - start) / (next - start),
      toNext: next - weighted,
    };
  });
}

/** The muscle with the highest level, then the most sets, or null before any set. */
export function strongestMuscle(levels: MuscleLevel[]): MuscleLevel | null {
  const sorted = [...levels].sort((a, b) => b.level - a.level || b.weighted - a.weighted);
  return sorted[0] && sorted[0].weighted > 0 ? sorted[0] : null;
}
