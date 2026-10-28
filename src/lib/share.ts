import { format, parseISO } from "date-fns";
import type { IntensityLevel } from "@/lib/muscle-intensity";
import { MUSCLE_GROUPS, MUSCLE_LABELS, type MuscleGroup } from "@/lib/muscles";
import { FOCUS_LABELS, FOCUS_ORDER, focusOf, type Focus } from "@/lib/suggestion";
import type { Exercise, WorkoutSession, WorkoutSet } from "@/lib/types";
import { displayVolume, displayWeight, type WeightUnit } from "@/lib/units";
import { formatDuration } from "@/lib/workout";

/** Everything a share image shows, already formatted. The drawing code adds no logic of its own. */
export type ShareCard = {
  /** "Push day", "Legs day" or "Full body". */
  title: string;
  /** "Tue 28 Oct 2026". */
  dateLabel: string;
  /** "1h 05m", or null while the duration is unknown. */
  duration: string | null;
  sets: number;
  exercises: number;
  /** Total volume, already in the user's unit and with separators, for example "12,340". */
  volume: string;
  unit: WeightUnit;
  /** The most worked muscles, with `ratio` 0 to 1 against the most worked one. */
  muscles: { label: string; sets: number; ratio: number }[];
  /** The exercises with the most volume, each with its heaviest set. */
  topLifts: { name: string; best: string }[];
  /** How hard each muscle was worked in this workout, for the body picture. */
  bodyLevels: Record<MuscleGroup, IntensityLevel>;
  /** Where the workout happened, for example "Iron Gym, Central Branch" or "Home workout". Null when unknown. */
  location: string | null;
};

/** Weighted sets in one workout for a muscle to count as worked a little, a fair amount, or a lot. */
export const BODY_LEVEL_SETS = { low: 0.5, mid: 3, high: 6 } as const;

/** Primary muscles count a full set and secondary muscles half, like the heatmap. */
export function workoutMuscleLevels(sets: WorkoutSet[], exercises: Exercise[]): Record<MuscleGroup, IntensityLevel> {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const score = new Map<MuscleGroup, number>();
  for (const set of sets) {
    const exercise = byId.get(set.exercise_id);
    if (!exercise) continue;
    score.set(exercise.primary_muscle, (score.get(exercise.primary_muscle) ?? 0) + 1);
    for (const m of exercise.secondary_muscles) score.set(m, (score.get(m) ?? 0) + 0.5);
  }
  return Object.fromEntries(
    MUSCLE_GROUPS.map((m) => {
      const v = score.get(m) ?? 0;
      const level: IntensityLevel =
        v >= BODY_LEVEL_SETS.high ? "high" : v >= BODY_LEVEL_SETS.mid ? "mid" : v >= BODY_LEVEL_SETS.low ? "low" : "none";
      return [m, level];
    }),
  ) as Record<MuscleGroup, IntensityLevel>;
}

/**
 * The place line for a workout: the gym's name and the first part of its address for a gym day, "Home workout" for a home day.
 * Never coordinates. Null when there is no check-in for the day or no gym to name.
 */
export function workoutLocation(input: {
  kind: "gym" | "home" | "rest" | null;
  gymName: string | null;
  gymLocation: string | null;
}): string | null {
  if (input.kind === "home") return "Home workout";
  if (input.kind === "gym" && input.gymName) {
    // The address field can be a whole geocoded address. Keep the first part, which is the place's own name.
    const area = input.gymLocation?.split(",")[0]?.trim();
    return area && area.toLowerCase() !== input.gymName.toLowerCase() ? `${input.gymName}, ${area}` : input.gymName;
  }
  return null;
}

const MAX_MUSCLES = 5;
const MAX_LIFTS = 3;
/** One split day has to hold this share of the sets to name the workout after it. */
const FOCUS_SHARE = 0.65;

/** Title from where the sets went: a clear push, pull or legs day is named so, anything else is full body. */
export function workoutTitle(muscleSets: Map<MuscleGroup, number>): string {
  let total = 0;
  const byFocus = new Map<Focus, number>();
  for (const [muscle, count] of muscleSets) {
    total += count;
    const focus = focusOf(muscle);
    if (focus) byFocus.set(focus, (byFocus.get(focus) ?? 0) + count);
  }
  if (total === 0) return "Workout";
  for (const focus of FOCUS_ORDER) {
    if ((byFocus.get(focus) ?? 0) / total >= FOCUS_SHARE) return `${FOCUS_LABELS[focus]} day`;
  }
  return "Full body";
}

export function buildShareCard(input: {
  session: Pick<WorkoutSession, "date" | "duration_minutes">;
  sets: WorkoutSet[];
  exercises: Exercise[];
  unit: WeightUnit;
  location?: string | null;
}): ShareCard {
  const { session, sets, exercises, unit, location = null } = input;
  const byId = new Map(exercises.map((e) => [e.id, e]));

  const muscleSets = new Map<MuscleGroup, number>();
  const lifts = new Map<string, { name: string; volume: number; best: WorkoutSet }>();
  let volumeKg = 0;

  for (const set of sets) {
    const exercise = byId.get(set.exercise_id);
    const setVolume = set.reps * set.weight_kg;
    volumeKg += setVolume;
    if (!exercise) continue;

    muscleSets.set(exercise.primary_muscle, (muscleSets.get(exercise.primary_muscle) ?? 0) + 1);

    const lift = lifts.get(exercise.id) ?? { name: exercise.name, volume: 0, best: set };
    lift.volume += setVolume;
    // The heaviest set, and among equal weights the one with more reps.
    if (set.weight_kg > lift.best.weight_kg || (set.weight_kg === lift.best.weight_kg && set.reps > lift.best.reps)) {
      lift.best = set;
    }
    lifts.set(exercise.id, lift);
  }

  const ranked = [...muscleSets].sort((a, b) => b[1] - a[1] || MUSCLE_LABELS[a[0]].localeCompare(MUSCLE_LABELS[b[0]]));
  const top = ranked[0]?.[1] ?? 1;

  return {
    title: workoutTitle(muscleSets),
    dateLabel: format(parseISO(session.date), "EEE d MMM yyyy"),
    duration: session.duration_minutes !== null ? formatDuration(session.duration_minutes) : null,
    sets: sets.length,
    exercises: new Set(sets.map((s) => s.exercise_id)).size,
    volume: displayVolume(volumeKg, unit),
    unit,
    muscles: ranked.slice(0, MAX_MUSCLES).map(([muscle, count]) => ({
      label: MUSCLE_LABELS[muscle],
      sets: count,
      ratio: count / top,
    })),
    topLifts: [...lifts.values()]
      .sort((a, b) => b.volume - a.volume || a.name.localeCompare(b.name))
      .slice(0, MAX_LIFTS)
      .map(({ name, best }) => ({
        name,
        best:
          best.weight_kg > 0
            ? `${displayWeight(best.weight_kg, unit)} ${unit} x ${best.reps}`
            : `Bodyweight x ${best.reps}`,
      })),
    bodyLevels: workoutMuscleLevels(sets, exercises),
    location,
  };
}
