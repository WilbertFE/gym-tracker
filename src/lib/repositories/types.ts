import type { ProgressPhoto, WorkoutSet } from "@/lib/types";

/** Result shapes shared by the in-memory and Supabase repositories. */

export type DeleteExerciseResult = "deleted" | "built_in" | "not_found" | "in_use";

export type CreatePhotoResult =
  | { ok: true; photo: ProgressPhoto }
  | { ok: false; reason: "limit_reached" };

export type AddSetResult =
  | { ok: true; set: WorkoutSet }
  | { ok: false; reason: "session_not_found" | "exercise_not_found" };
