import type { MuscleStat } from "@/lib/muscle-intensity";
import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/muscles";

export type UntrainedMuscle = {
  muscle: MuscleGroup;
  /** Days since the muscle was last worked at all, or null if never. */
  daysAgo: number | null;
};

export type Coverage = {
  /** Muscle groups with at least some work in the period. */
  trained: number;
  total: number;
  percent: number;
  /** Groups with no work, never trained first, then the longest wait. */
  untrained: UntrainedMuscle[];
};

/** How many of the 16 muscle groups got any work this week, and which did not. */
export function weeklyCoverage(stats: MuscleStat[]): Coverage {
  const total = MUSCLE_GROUPS.length;
  const untrained = stats
    .filter((s) => s.weekly.score <= 0)
    .map((s) => ({ muscle: s.muscle, daysAgo: s.lastTrainedDaysAgo }))
    .sort(
      (a, b) =>
        (b.daysAgo ?? Number.POSITIVE_INFINITY) - (a.daysAgo ?? Number.POSITIVE_INFINITY) ||
        MUSCLE_GROUPS.indexOf(a.muscle) - MUSCLE_GROUPS.indexOf(b.muscle),
    );
  const trained = stats.filter((s) => s.weekly.score > 0).length;
  return { trained, total, percent: Math.round((trained / total) * 100), untrained };
}

/** A short, encouraging line that says how far along the week is. */
export function coverageMessage({ trained, total }: Pick<Coverage, "trained" | "total">): string {
  const left = total - trained;
  if (trained <= 0) return "Fresh week. Start a workout to light up the map.";
  if (left <= 0) return "Every muscle group trained this week. Great work.";
  if (trained / total < 0.5) return `${trained} down, ${left} to go.`;
  return `Almost there. Only ${left} ${left === 1 ? "group" : "groups"} left.`;
}

/** Comparison with last week's coverage, for example "+2 vs last week". */
export function coverageDelta(current: number, previous: number): string {
  const diff = current - previous;
  if (diff === 0) return "Same as last week";
  return `${diff > 0 ? "+" : ""}${diff} vs last week`;
}

export type WorkedMuscle = { muscle: MuscleGroup; sets: number };

/**
 * Muscles that got work, most sets first. Pass the stats of one workout to see
 * what it trained. Counts are weighted: primary sets 1, secondary sets 0.5.
 */
export function workedMuscles(stats: MuscleStat[]): WorkedMuscle[] {
  return stats
    .filter((s) => s.overall.score > 0)
    .map((s) => ({ muscle: s.muscle, sets: s.overall.score }))
    .sort((a, b) => b.sets - a.sets || MUSCLE_GROUPS.indexOf(a.muscle) - MUSCLE_GROUPS.indexOf(b.muscle));
}
