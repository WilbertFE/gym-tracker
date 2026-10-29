import type { Opening } from "@/lib/chests";
import type { LeaderboardEntry } from "@/lib/leaderboard";
import type { LogPhoto, ProgressPhoto, WorkoutSet, XpBoost } from "@/lib/types";

/** Result shapes shared by the in-memory and Supabase repositories. */

export type DeleteExerciseResult = "deleted" | "built_in" | "not_found" | "in_use";

export type CreatePhotoResult =
  | { ok: true; photo: ProgressPhoto }
  | { ok: false; reason: "limit_reached" };

export type AddSetResult =
  | { ok: true; set: WorkoutSet }
  | { ok: false; reason: "session_not_found" | "exercise_not_found" };

export type UpsertEntryResult =
  | { ok: true; entry: LeaderboardEntry }
  | { ok: false; reason: "name_taken" };

export type RecordOpeningResult =
  | { ok: true; opening: Opening }
  | { ok: false; reason: "already_opened" | "unavailable" };

export type CreateBoostResult =
  | { ok: true; boost: XpBoost }
  | { ok: false; reason: "already_boosted" };

export type CreateLogPhotoResult =
  | { ok: true; photo: LogPhoto }
  | { ok: false; reason: "entry_not_found" | "limit_reached" };
