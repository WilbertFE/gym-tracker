import { differenceInCalendarDays, parseISO } from "date-fns";
import type { MuscleGroup } from "@/lib/muscles";
import type { Exercise, WorkoutSession, WorkoutSet } from "@/lib/types";

export const FOCUS_ORDER = ["push", "pull", "legs"] as const;
export type Focus = (typeof FOCUS_ORDER)[number];

export const FOCUS_LABELS: Record<Focus, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
};

/** Which muscles belong to each split day. Core is trained as an add-on. */
export const FOCUS_MUSCLES: Record<Focus, MuscleGroup[]> = {
  push: ["chest", "front_delts", "side_delts", "triceps"],
  pull: ["lats", "rear_delts", "biceps", "traps", "forearms", "lower_back"],
  legs: ["quads", "hamstrings", "glutes", "calves"],
};

export function focusOf(muscle: MuscleGroup): Focus | null {
  return FOCUS_ORDER.find((f) => FOCUS_MUSCLES[f].includes(muscle)) ?? null;
}

export type Suggestion = {
  focus: Focus;
  /** Days since this focus was last trained, or null if never. */
  daysSince: number | null;
  reason: string;
  exercises: Exercise[];
};

const MAX_EXERCISES = 5;
const MAX_PER_MUSCLE = 2;

/**
 * Suggests the push, pull or legs day that has waited longest. Ties (including
 * "never trained") fall back to the order push, pull, legs. Exercises are the
 * ones the user does most often for that focus, topped up from the library.
 */
export function suggestNextWorkout(input: {
  sessions: WorkoutSession[];
  sets: WorkoutSet[];
  exercises: Exercise[];
  today: string;
}): Suggestion {
  const { sessions, sets, exercises, today } = input;
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));
  const sessionDate = new Map(sessions.map((s) => [s.id, s.date]));

  const lastTrained = new Map<Focus, string>();
  const usage = new Map<string, number>();
  for (const set of sets) {
    usage.set(set.exercise_id, (usage.get(set.exercise_id) ?? 0) + 1);
    const exercise = exerciseById.get(set.exercise_id);
    const date = sessionDate.get(set.session_id);
    const focus = exercise ? focusOf(exercise.primary_muscle) : null;
    if (!focus || !date) continue;
    const prev = lastTrained.get(focus);
    if (!prev || date > prev) lastTrained.set(focus, date);
  }

  const daysSinceOf = (f: Focus) => {
    const last = lastTrained.get(f);
    return last ? differenceInCalendarDays(parseISO(today), parseISO(last)) : null;
  };

  // Never trained counts as the longest wait.
  const wait = (f: Focus) => daysSinceOf(f) ?? Number.POSITIVE_INFINITY;
  const focus = FOCUS_ORDER.reduce((best, f) => (wait(f) > wait(best) ? f : best));
  const daysSince = daysSinceOf(focus);

  const index = new Map(exercises.map((e, i) => [e.id, i]));
  const candidates = exercises
    .filter((e) => focusOf(e.primary_muscle) === focus)
    .sort(
      (a, b) =>
        (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0) ||
        (index.get(a.id) ?? 0) - (index.get(b.id) ?? 0),
    );

  const perMuscle = new Map<MuscleGroup, number>();
  const picked: Exercise[] = [];
  for (const e of candidates) {
    const count = perMuscle.get(e.primary_muscle) ?? 0;
    if (count >= MAX_PER_MUSCLE) continue;
    perMuscle.set(e.primary_muscle, count + 1);
    picked.push(e);
    if (picked.length === MAX_EXERCISES) break;
  }

  const label = FOCUS_LABELS[focus];
  const reason =
    daysSince === null
      ? sessions.length === 0
        ? `${label} is a good first day. No workouts logged yet.`
        : `${label} has not been trained yet.`
      : daysSince === 0
        ? "Push, pull and legs were all trained today. Rest up."
        : `${label} was last trained ${daysSince} day${daysSince === 1 ? "" : "s"} ago.`;

  return { focus, daysSince, reason, exercises: picked };
}
