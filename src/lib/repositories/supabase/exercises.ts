import "server-only";
import type { Exercise } from "@/lib/types";
import type { ExerciseInput } from "@/lib/validation/workout";
import type { DeleteExerciseResult } from "../types";
import { check, fetchAll, getDb, isForeignKeyViolation } from "./db";

const COLUMNS = "id,user_id,name,primary_muscle,secondary_muscles,equipment";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toExercise = (r: any): Exercise => ({
  id: r.id,
  user_id: r.user_id,
  name: r.name,
  primary_muscle: r.primary_muscle,
  secondary_muscles: r.secondary_muscles ?? [],
  equipment: r.equipment,
});

/**
 * Built-in exercises (user_id null) plus the user's own, sorted by name. Row
 * Level Security lets everyone read built-ins and only the owner read the rest.
 */
export async function listExercises(userId: string): Promise<Exercise[]> {
  const db = await getDb();
  const rows = await fetchAll((from, to) =>
    db
      .from("exercises")
      .select(COLUMNS)
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .order("name")
      .order("id")
      .range(from, to),
  );
  return rows.map(toExercise).sort((a, b) => a.name.localeCompare(b.name));
}

export async function createExercise(userId: string, input: ExerciseInput): Promise<Exercise> {
  const db = await getDb();
  const { data, error } = await db
    .from("exercises")
    .insert({
      user_id: userId,
      name: input.name,
      primary_muscle: input.primary_muscle,
      secondary_muscles: input.secondary_muscles.filter((m) => m !== input.primary_muscle),
      equipment: input.equipment || null,
    })
    .select(COLUMNS)
    .single();
  check(error);
  return toExercise(data);
}

/** Only the user's own exercises can be deleted, and only if no set uses them. */
export async function deleteExercise(userId: string, id: string): Promise<DeleteExerciseResult> {
  const db = await getDb();
  const { data: row, error: readError } = await db
    .from("exercises")
    .select("id,user_id")
    .eq("id", id)
    .maybeSingle();
  check(readError);
  if (!row) return "not_found";
  if (row.user_id === null) return "built_in";
  if (row.user_id !== userId) return "not_found";

  // workout_sets.exercise_id references exercises.id, so the database refuses
  // the delete while any set uses it.
  const { data, error } = await db.from("exercises").delete().eq("id", id).eq("user_id", userId).select("id");
  if (isForeignKeyViolation(error)) return "in_use";
  check(error);
  return (data?.length ?? 0) > 0 ? "deleted" : "not_found";
}
