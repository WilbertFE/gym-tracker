import type { Exercise, WeightLog } from "@/lib/types";

/** The body weight used when the user has never logged one, in kilograms. */
export const DEFAULT_BODY_WEIGHT_KG = 60;

/** Exercises where a share of the body weight is the load (push ups, pull ups, dips). */
export const isBodyweightExercise = (exercise: Pick<Exercise, "bodyweight_pct"> | null | undefined): boolean =>
  !!exercise && exercise.bodyweight_pct !== null && exercise.bodyweight_pct !== undefined && exercise.bodyweight_pct > 0;

/**
 * The weight lifted in one rep, in kilograms. For a bodyweight exercise it is the logged weight (what was added on
 * top, a vest or a plate) plus its share of the body weight; for any other exercise it is the logged weight.
 */
export function effectiveLoadKg(
  loggedKg: number,
  exercise: Pick<Exercise, "bodyweight_pct"> | null | undefined,
  bodyWeightKg: number = DEFAULT_BODY_WEIGHT_KG,
): number {
  if (!exercise || !isBodyweightExercise(exercise)) return loggedKg;
  return loggedKg + ((exercise.bodyweight_pct as number) / 100) * bodyWeightKg;
}

/**
 * The body weight on a day: the nearest weigh-in on or before it, otherwise the oldest one (it is all we know),
 * otherwise {@link DEFAULT_BODY_WEIGHT_KG}.
 */
export function bodyWeightOn(date: string, weights: readonly Pick<WeightLog, "date" | "weight_kg">[]): number {
  let before: Pick<WeightLog, "date" | "weight_kg"> | null = null;
  let oldest: Pick<WeightLog, "date" | "weight_kg"> | null = null;
  for (const w of weights) {
    if (w.date <= date && (!before || w.date > before.date)) before = w;
    if (!oldest || w.date < oldest.date) oldest = w;
  }
  return (before ?? oldest)?.weight_kg ?? DEFAULT_BODY_WEIGHT_KG;
}

type LoadableSet = { exercise_id: string; session_id: string; weight_kg: number };

/**
 * The sets with the weight of a bodyweight exercise replaced by its real load per rep (the added weight plus its share
 * of the body weight on the day of its session), so volume, strength, gate damage and the share image count it. A set of
 * any other exercise is returned as it is. Use it for numbers, never to show what was logged.
 */
export function withBodyweightLoad<S extends LoadableSet>(
  sets: readonly S[],
  exercises: readonly Pick<Exercise, "id" | "bodyweight_pct">[],
  sessions: readonly { id: string; date: string }[],
  weights: readonly Pick<WeightLog, "date" | "weight_kg">[],
): S[] {
  const byExercise = new Map(exercises.map((e) => [e.id, e]));
  const dateOf = new Map(sessions.map((s) => [s.id, s.date]));
  const bodyOn = new Map<string, number>();
  return sets.map((set) => {
    const exercise = byExercise.get(set.exercise_id);
    if (!isBodyweightExercise(exercise)) return set;
    const date = dateOf.get(set.session_id) ?? "";
    let body = bodyOn.get(date);
    if (body === undefined) {
      body = bodyWeightOn(date, weights);
      bodyOn.set(date, body);
    }
    return { ...set, weight_kg: effectiveLoadKg(set.weight_kg, exercise, body) };
  });
}
