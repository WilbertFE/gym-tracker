import { INTENSITY_CONFIG, type MuscleStat } from "@/lib/muscle-intensity";
import type { MuscleGroup } from "@/lib/muscles";

export type MuscleRecommendation = {
  muscle: MuscleGroup;
  weeklySets: number;
  daysSince: number | null;
  /** Primary sets needed this week to reach the moderate level. */
  setsToModerate: number;
  reason: string;
  exercises: string[];
};

function sinceText(days: number | null): string {
  if (days === null) return "never trained";
  if (days === 0) return "trained today";
  if (days === 1) return "last trained yesterday";
  return `last trained ${days} days ago`;
}

/**
 * Muscles that are untrained or light this week, most neglected first: fewest
 * weekly sets, then longest since last trained (never trained counts as longest),
 * then fewest all time sets.
 */
export function recommendUndertrained(stats: MuscleStat[], limit = 4): MuscleRecommendation[] {
  const { lowMax } = INTENSITY_CONFIG.weekly;
  const moderateAt = lowMax + 1;

  return stats
    .map((stat, index) => ({ stat, index }))
    .filter(({ stat }) => stat.weekly.level === "none" || stat.weekly.level === "low")
    .sort((a, b) => {
      const days = (s: MuscleStat) => s.lastTrainedDaysAgo ?? Number.POSITIVE_INFINITY;
      return (
        a.stat.weekly.score - b.stat.weekly.score ||
        days(b.stat) - days(a.stat) ||
        a.stat.overall.score - b.stat.overall.score ||
        a.index - b.index
      );
    })
    .slice(0, limit)
    .map(({ stat }) => {
      const score = stat.weekly.score;
      const reason =
        score === 0
          ? `No sets this week, ${sinceText(stat.lastTrainedDaysAgo)}.`
          : `${score} weighted ${score === 1 ? "set" : "sets"} this week, ${sinceText(stat.lastTrainedDaysAgo)}.`;
      return {
        muscle: stat.muscle,
        weeklySets: score,
        daysSince: stat.lastTrainedDaysAgo,
        setsToModerate: Math.max(1, Math.ceil(moderateAt - score)),
        reason,
        exercises: stat.suggestions,
      };
    });
}
