import "server-only";
import { BUILT_IN_BODYWEIGHT_PCT } from "@/lib/exercise-library";
import type { Exercise } from "@/lib/types";
import type { ExerciseInput } from "@/lib/validation/workout";
import type { DeleteExerciseResult } from "../types";
import { check, fetchAll, getDb, isForeignKeyViolation, isUuid } from "./db";

const BASE_COLUMNS = "id,user_id,name,primary_muscle,secondary_muscles,equipment";
const COLUMNS = `${BASE_COLUMNS},bodyweight_pct`;

/**
 * Until the migration that adds `bodyweight_pct` has run, selecting the column fails. The first time that happens we
 * remember it and read without the column (built-ins still get their share from the code), so the app keeps working.
 */
let hasPctColumn = true;
const isMissingPctColumn = (message: string) => /bodyweight_pct/.test(message);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toExercise = (r: any): Exercise => ({
  id: r.id,
  user_id: r.user_id,
  name: r.name,
  primary_muscle: r.primary_muscle,
  secondary_muscles: r.secondary_muscles ?? [],
  equipment: r.equipment,
  // A built-in takes its share from the code, because its database copy only changes with a migration.
  bodyweight_pct: r.user_id === null ? (BUILT_IN_BODYWEIGHT_PCT[r.name] ?? null) : r.bodyweight_pct === null || r.bodyweight_pct === undefined ? null : Number(r.bodyweight_pct),
});

/**
 * Built-in exercises (user_id null) plus the user's own, sorted by name. Row
 * Level Security lets everyone read built-ins and only the owner read the rest.
 */
export async function listExercises(userId: string): Promise<Exercise[]> {
  const db = await getDb();
  const read = () =>
    fetchAll((from, to) =>
      db
        .from("exercises")
        .select(hasPctColumn ? COLUMNS : BASE_COLUMNS)
        .or(`user_id.is.null,user_id.eq.${userId}`)
        .order("name")
        .order("id")
        .range(from, to),
    );
  let rows;
  try {
    rows = await read();
  } catch (error) {
    if (!hasPctColumn || !isMissingPctColumn((error as Error).message)) throw error;
    hasPctColumn = false;
    rows = await read();
  }
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
      ...(hasPctColumn && input.bodyweight_pct != null ? { bodyweight_pct: input.bodyweight_pct } : {}),
    })
    .select(hasPctColumn ? COLUMNS : BASE_COLUMNS)
    .single();
  check(error);
  return toExercise(data);
}

/** Only the user's own exercises can be deleted, and only if no set uses them. */
export async function deleteExercise(userId: string, id: string): Promise<DeleteExerciseResult> {
  if (!isUuid(id)) return "not_found";
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
