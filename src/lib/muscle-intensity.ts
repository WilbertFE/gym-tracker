import { differenceInCalendarDays, parseISO } from "date-fns";
import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/muscles";
import type { Exercise, WorkoutSession, WorkoutSet } from "@/lib/types";
import { weekRange } from "@/lib/week";

export type IntensityLevel = "none" | "low" | "mid" | "high";
export type Period = "weekly" | "overall";

/**
 * All tunable numbers and wording for the heatmap live here.
 *
 * Open question from the README: should red mean "heavily trained, needs rest"
 * or "dangerously overtrained"? It defaults to the first. Change `labels.high`
 * and the `hints` text to switch the meaning without touching any logic.
 */
export const INTENSITY_CONFIG = {
  /** Weight of one set for a muscle that is the primary or a secondary target. */
  setWeights: { primary: 1, secondary: 0.5 },
  /** Weekly: weighted sets in the current Monday to Sunday week. */
  weekly: { lowMax: 5, midMax: 12 },
  /** Overall: share of the user's own most trained muscle (all time). */
  overall: { lowMax: 1 / 3, midMax: 2 / 3 },
  labels: {
    none: "Untrained",
    low: "Light",
    mid: "Moderate",
    high: "Heavy",
  } satisfies Record<IntensityLevel, string>,
  hints: {
    none: "No sets yet in this period.",
    low: "Room for more work.",
    mid: "A solid amount of work.",
    high: "Heavily trained. Make sure it can recover.",
  } satisfies Record<IntensityLevel, string>,
  topExercises: 3,
  suggestions: 3,
} as const;

export function weeklyLevel(score: number): IntensityLevel {
  const { lowMax, midMax } = INTENSITY_CONFIG.weekly;
  if (score <= 0) return "none";
  if (score <= lowMax) return "low";
  if (score <= midMax) return "mid";
  return "high";
}

/** `max` is the highest overall score across all muscles. */
export function overallLevel(score: number, max: number): IntensityLevel {
  const { lowMax, midMax } = INTENSITY_CONFIG.overall;
  if (score <= 0 || max <= 0) return "none";
  const ratio = score / max;
  if (ratio <= lowMax) return "low";
  if (ratio <= midMax) return "mid";
  return "high";
}

export type ExerciseContribution = { name: string; sets: number };

export type PeriodStat = {
  /** Weighted sets: primary 1.0, secondary 0.5. */
  score: number;
  level: IntensityLevel;
  /** Exercises that contributed most, by weighted sets. */
  topExercises: ExerciseContribution[];
};

export type MuscleStat = {
  muscle: MuscleGroup;
  weekly: PeriodStat;
  overall: PeriodStat;
  /** Days since the muscle was last worked at all (primary or secondary), or null. */
  lastTrainedDaysAgo: number | null;
  /** Exercises that target this muscle as primary, favouring ones the user does. */
  suggestions: string[];
};

type Tally = Map<string, { sets: number; weighted: number }>;

/** Weighted score per muscle, plus which exercises produced it. */
function tally(
  sets: WorkoutSet[],
  exerciseById: Map<string, Exercise>,
  include: (set: WorkoutSet) => boolean,
): Record<MuscleGroup, Tally> {
  const out = Object.fromEntries(MUSCLE_GROUPS.map((m) => [m, new Map() as Tally])) as Record<
    MuscleGroup,
    Tally
  >;
  const { primary, secondary } = INTENSITY_CONFIG.setWeights;

  for (const set of sets) {
    if (!include(set)) continue;
    const exercise = exerciseById.get(set.exercise_id);
    if (!exercise) continue;

    const targets: [MuscleGroup, number][] = [
      [exercise.primary_muscle, primary],
      ...exercise.secondary_muscles
        .filter((m) => m !== exercise.primary_muscle)
        .map((m): [MuscleGroup, number] => [m, secondary]),
    ];
    for (const [muscle, weight] of targets) {
      const row = out[muscle].get(exercise.id) ?? { sets: 0, weighted: 0 };
      row.sets += 1;
      row.weighted += weight;
      out[muscle].set(exercise.id, row);
    }
  }
  return out;
}

const total = (t: Tally) => [...t.values()].reduce((sum, r) => sum + r.weighted, 0);

function topExercises(t: Tally, exerciseById: Map<string, Exercise>): ExerciseContribution[] {
  return [...t.entries()]
    .sort((a, b) => b[1].weighted - a[1].weighted)
    .slice(0, INTENSITY_CONFIG.topExercises)
    .map(([id, row]) => ({ name: exerciseById.get(id)?.name ?? "Unknown", sets: row.sets }));
}

/** Heatmap data for every muscle group, for both periods. Always 16 entries. */
export function buildMuscleStats(input: {
  sessions: WorkoutSession[];
  sets: WorkoutSet[];
  exercises: Exercise[];
  today: string;
}): MuscleStat[] {
  const { sessions, sets, exercises, today } = input;
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));
  const sessionDate = new Map(sessions.map((s) => [s.id, s.date]));
  const { start, end } = weekRange(today);

  const knownSets = sets.filter((s) => sessionDate.has(s.session_id));
  const weeklyTally = tally(knownSets, exerciseById, (s) => {
    const date = sessionDate.get(s.session_id)!;
    return date >= start && date <= end;
  });
  const overallTally = tally(knownSets, exerciseById, () => true);

  const overallScores = MUSCLE_GROUPS.map((m) => total(overallTally[m]));
  const overallMax = Math.max(0, ...overallScores);

  // Latest date each muscle was involved in any set.
  const lastDate = new Map<MuscleGroup, string>();
  const usage = new Map<string, number>();
  for (const set of knownSets) {
    usage.set(set.exercise_id, (usage.get(set.exercise_id) ?? 0) + 1);
    const exercise = exerciseById.get(set.exercise_id);
    if (!exercise) continue;
    const date = sessionDate.get(set.session_id)!;
    for (const m of [exercise.primary_muscle, ...exercise.secondary_muscles]) {
      const prev = lastDate.get(m);
      if (!prev || date > prev) lastDate.set(m, date);
    }
  }

  return MUSCLE_GROUPS.map((muscle) => {
    const weeklyScore = total(weeklyTally[muscle]);
    const overallScore = total(overallTally[muscle]);
    const last = lastDate.get(muscle);

    const suggestions = exercises
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.primary_muscle === muscle)
      .sort((a, b) => (usage.get(b.e.id) ?? 0) - (usage.get(a.e.id) ?? 0) || a.i - b.i)
      .slice(0, INTENSITY_CONFIG.suggestions)
      .map(({ e }) => e.name);

    return {
      muscle,
      weekly: {
        score: weeklyScore,
        level: weeklyLevel(weeklyScore),
        topExercises: topExercises(weeklyTally[muscle], exerciseById),
      },
      overall: {
        score: overallScore,
        level: overallLevel(overallScore, overallMax),
        topExercises: topExercises(overallTally[muscle], exerciseById),
      },
      lastTrainedDaysAgo: last
        ? differenceInCalendarDays(parseISO(today), parseISO(last))
        : null,
      suggestions,
    };
  });
}
