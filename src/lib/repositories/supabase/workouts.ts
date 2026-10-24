import "server-only";
import { todayISO } from "@/lib/dates";
import type { WorkoutSession, WorkoutSet } from "@/lib/types";
import type { SetInput, SetUpdateInput } from "@/lib/validation/workout";
import { computeDurationMinutes, pickLastSets } from "@/lib/workout";
import type { AddSetResult } from "../types";
import { check, fetchAll, getDb, isUniqueViolation, numOrNull } from "./db";

const SESSION_COLUMNS = "id,user_id,date,started_at,ended_at,duration_minutes,notes";
const SET_COLUMNS = "id,session_id,exercise_id,set_number,reps,weight_kg,rpe";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toSession = (r: any): WorkoutSession => ({
  id: r.id,
  user_id: r.user_id,
  date: r.date,
  started_at: r.started_at,
  ended_at: r.ended_at,
  duration_minutes: r.duration_minutes,
  notes: r.notes,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toSet = (r: any): WorkoutSet => ({
  id: r.id,
  session_id: r.session_id,
  exercise_id: r.exercise_id,
  set_number: r.set_number,
  reps: r.reps,
  weight_kg: Number(r.weight_kg),
  rpe: numOrNull(r.rpe),
});

async function findSession(userId: string, id: string): Promise<WorkoutSession | null> {
  const db = await getDb();
  const { data, error } = await db
    .from("workout_sessions")
    .select(SESSION_COLUMNS)
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  check(error);
  return data ? toSession(data) : null;
}

/** Newest first. */
export async function listSessions(userId: string): Promise<WorkoutSession[]> {
  const db = await getDb();
  const rows = await fetchAll((from, to) =>
    db
      .from("workout_sessions")
      .select(SESSION_COLUMNS)
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .order("id")
      .range(from, to),
  );
  return rows.map(toSession);
}

/** Every set that belongs to one of the user's sessions (Row Level Security scopes this). */
export async function listAllSets(userId: string): Promise<WorkoutSet[]> {
  void userId; // Ownership is enforced through the parent session by RLS.
  const db = await getDb();
  const rows = await fetchAll((from, to) =>
    db
      .from("workout_sets")
      .select(SET_COLUMNS)
      .order("session_id")
      .order("exercise_id")
      .order("set_number")
      .range(from, to),
  );
  return rows.map(toSet);
}

export async function getActiveSession(userId: string): Promise<WorkoutSession | null> {
  const db = await getDb();
  const { data, error } = await db
    .from("workout_sessions")
    .select(SESSION_COLUMNS)
    .eq("user_id", userId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  check(error);
  return data ? toSession(data) : null;
}

export async function getSessionWithSets(userId: string, id: string) {
  const session = await findSession(userId, id);
  if (!session) return null;

  const db = await getDb();
  const { data, error } = await db
    .from("workout_sets")
    .select(SET_COLUMNS)
    .eq("session_id", id)
    .order("set_number")
    .order("id");
  check(error);
  return { session, sets: (data ?? []).map(toSet) };
}

/**
 * Only one workout can be in progress: starting again returns the active one.
 * A partial unique index on (user_id) where ended_at is null makes this safe
 * even if two requests race.
 */
export async function startSession(
  userId: string,
  notes: string | null,
): Promise<{ session: WorkoutSession; created: boolean }> {
  const active = await getActiveSession(userId);
  if (active) return { session: active, created: false };

  const db = await getDb();
  const { data, error } = await db
    .from("workout_sessions")
    .insert({
      user_id: userId,
      date: todayISO(),
      started_at: new Date().toISOString(),
      notes,
    })
    .select(SESSION_COLUMNS)
    .single();

  if (isUniqueViolation(error)) {
    const raced = await getActiveSession(userId);
    if (raced) return { session: raced, created: false };
  }
  check(error);
  return { session: toSession(data), created: true };
}

/** Idempotent: finishing a finished workout returns it unchanged. */
export async function finishSession(userId: string, id: string): Promise<WorkoutSession | null> {
  const session = await findSession(userId, id);
  if (!session) return null;
  if (session.ended_at) return session;

  const endedAt = new Date().toISOString();
  const db = await getDb();
  const { data, error } = await db
    .from("workout_sessions")
    .update({
      ended_at: endedAt,
      duration_minutes: computeDurationMinutes(session.started_at, endedAt),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .is("ended_at", null)
    .select(SESSION_COLUMNS)
    .maybeSingle();
  check(error);
  // Null means another request finished it first, so return that result.
  return data ? toSession(data) : findSession(userId, id);
}

export async function updateSessionNotes(
  userId: string,
  id: string,
  notes: string | null,
): Promise<WorkoutSession | null> {
  const db = await getDb();
  const { data, error } = await db
    .from("workout_sessions")
    .update({ notes })
    .eq("id", id)
    .eq("user_id", userId)
    .select(SESSION_COLUMNS)
    .maybeSingle();
  check(error);
  return data ? toSession(data) : null;
}

/** Sets are removed by the foreign key's on delete cascade. */
export async function deleteSession(userId: string, id: string): Promise<boolean> {
  const db = await getDb();
  const { data, error } = await db
    .from("workout_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");
  check(error);
  return (data?.length ?? 0) > 0;
}

async function nextSetNumber(sessionId: string, exerciseId: string): Promise<number> {
  const db = await getDb();
  const { data, error } = await db
    .from("workout_sets")
    .select("set_number")
    .eq("session_id", sessionId)
    .eq("exercise_id", exerciseId)
    .order("set_number", { ascending: false })
    .limit(1);
  check(error);
  return (data?.[0]?.set_number ?? 0) + 1;
}

export async function addSet(
  userId: string,
  sessionId: string,
  input: SetInput,
): Promise<AddSetResult> {
  if (!(await findSession(userId, sessionId))) return { ok: false, reason: "session_not_found" };

  const db = await getDb();
  const { data: exercise, error: exerciseError } = await db
    .from("exercises")
    .select("id")
    .eq("id", input.exercise_id)
    .maybeSingle();
  check(exerciseError);
  if (!exercise) return { ok: false, reason: "exercise_not_found" };

  // The unique index on (session_id, exercise_id, set_number) rejects a duplicate
  // number if two sets are logged at the same instant, so retry once.
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await db
      .from("workout_sets")
      .insert({
        session_id: sessionId,
        exercise_id: input.exercise_id,
        set_number: await nextSetNumber(sessionId, input.exercise_id),
        reps: input.reps,
        weight_kg: input.weight_kg,
        rpe: input.rpe ?? null,
      })
      .select(SET_COLUMNS)
      .single();
    if (isUniqueViolation(error) && attempt === 0) continue;
    check(error);
    return { ok: true, set: toSet(data) };
  }
  throw new Error("Supabase error: could not assign a set number");
}

export async function updateSet(
  userId: string,
  sessionId: string,
  setId: string,
  input: SetUpdateInput,
): Promise<WorkoutSet | null> {
  if (!(await findSession(userId, sessionId))) return null;

  const db = await getDb();
  const { data, error } = await db
    .from("workout_sets")
    .update({ reps: input.reps, weight_kg: input.weight_kg, rpe: input.rpe ?? null })
    .eq("id", setId)
    .eq("session_id", sessionId)
    .select(SET_COLUMNS)
    .maybeSingle();
  check(error);
  return data ? toSet(data) : null;
}

/** Deletes a set and renumbers the later sets of that exercise, lowest first. */
export async function deleteSet(userId: string, sessionId: string, setId: string): Promise<boolean> {
  if (!(await findSession(userId, sessionId))) return false;

  const db = await getDb();
  const { data: target, error: readError } = await db
    .from("workout_sets")
    .select(SET_COLUMNS)
    .eq("id", setId)
    .eq("session_id", sessionId)
    .maybeSingle();
  check(readError);
  if (!target) return false;

  const { error: deleteError } = await db.from("workout_sets").delete().eq("id", setId);
  check(deleteError);

  const { data: later, error: laterError } = await db
    .from("workout_sets")
    .select("id,set_number")
    .eq("session_id", sessionId)
    .eq("exercise_id", target.exercise_id)
    .gt("set_number", target.set_number)
    .order("set_number");
  check(laterError);

  // Ascending order means each target number was just freed, so the unique index holds.
  for (const row of later ?? []) {
    const { error } = await db
      .from("workout_sets")
      .update({ set_number: row.set_number - 1 })
      .eq("id", row.id);
    check(error);
  }
  return true;
}

/**
 * The most recent set per exercise, used to prefill the logger. A set from the
 * current session wins over one from an earlier session.
 */
export async function lastSetsByExercise(
  userId: string,
  currentSessionId: string,
): Promise<Record<string, { reps: number; weight_kg: number }>> {
  const [sets, sessions] = await Promise.all([listAllSets(userId), listSessions(userId)]);
  return pickLastSets(sets, sessions, currentSessionId);
}
