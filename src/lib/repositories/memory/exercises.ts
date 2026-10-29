import "server-only";
import { BUILT_IN_EXERCISES } from "@/lib/exercise-library";
import type { Exercise } from "@/lib/types";
import type { ExerciseInput } from "@/lib/validation/workout";
import type { DeleteExerciseResult } from "../types";
import { getStore } from "./store";

/** Built-in exercises plus the user's own, sorted by name. */
export async function listExercises(userId: string): Promise<Exercise[]> {
  return [...BUILT_IN_EXERCISES, ...getStore(userId).exercises].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

export async function createExercise(userId: string, input: ExerciseInput): Promise<Exercise> {
  const row: Exercise = {
    id: crypto.randomUUID(),
    user_id: userId,
    name: input.name,
    primary_muscle: input.primary_muscle,
    secondary_muscles: input.secondary_muscles.filter((m) => m !== input.primary_muscle),
    equipment: input.equipment || null,
    bodyweight_pct: input.bodyweight_pct ?? null,
  };
  getStore(userId).exercises.push(row);
  return row;
}

/** Only the user's own exercises can be deleted, and only if no set uses them. */
export async function deleteExercise(userId: string, id: string): Promise<DeleteExerciseResult> {
  if (BUILT_IN_EXERCISES.some((e) => e.id === id)) return "built_in";
  const store = getStore(userId);
  if (!store.exercises.some((e) => e.id === id)) return "not_found";
  if (store.sets.some((s) => s.exercise_id === id)) return "in_use";
  store.exercises = store.exercises.filter((e) => e.id !== id);
  return "deleted";
}
