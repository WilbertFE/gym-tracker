import "server-only";
import { todayISO } from "@/lib/dates";
import type { WorkoutSession, WorkoutSet } from "@/lib/types";
import { computeDurationMinutes, nextSetNumber, pickLastSets } from "@/lib/workout";
import type { SetInput, SetUpdateInput } from "@/lib/validation/workout";
import type { AddSetResult } from "../types";
import { listExercises } from "./exercises";
import { getStore } from "./store";

const byStartDesc = (a: WorkoutSession, b: WorkoutSession) =>
  b.started_at.localeCompare(a.started_at);

function findSession(userId: string, id: string) {
  return getStore(userId).sessions.find((s) => s.id === id) ?? null;
}

/** Newest first. */
export async function listSessions(userId: string): Promise<WorkoutSession[]> {
  return [...getStore(userId).sessions].sort(byStartDesc);
}

/** Every set that belongs to one of the user's sessions. */
export async function listAllSets(userId: string): Promise<WorkoutSet[]> {
  return [...getStore(userId).sets];
}

export async function getActiveSession(userId: string): Promise<WorkoutSession | null> {
  return getStore(userId).sessions.find((s) => s.ended_at === null) ?? null;
}

export async function getSessionWithSets(userId: string, id: string) {
  const session = findSession(userId, id);
  if (!session) return null;
  const sets = getStore(userId)
    .sets.filter((s) => s.session_id === id)
    .sort((a, b) => a.set_number - b.set_number);
  return { session, sets };
}

/** Only one workout can be in progress: starting again returns the active one. */
export async function startSession(
  userId: string,
  notes: string | null,
): Promise<{ session: WorkoutSession; created: boolean }> {
  const active = await getActiveSession(userId);
  if (active) return { session: active, created: false };

  const session: WorkoutSession = {
    id: crypto.randomUUID(),
    user_id: userId,
    date: todayISO(),
    started_at: new Date().toISOString(),
    ended_at: null,
    duration_minutes: null,
    notes,
  };
  getStore(userId).sessions.push(session);
  return { session, created: true };
}

/** Idempotent: finishing a finished workout returns it unchanged. */
export async function finishSession(userId: string, id: string): Promise<WorkoutSession | null> {
  const session = findSession(userId, id);
  if (!session) return null;
  if (session.ended_at) return session;

  const endedAt = new Date().toISOString();
  session.ended_at = endedAt;
  session.duration_minutes = computeDurationMinutes(session.started_at, endedAt);
  return session;
}

export async function updateSessionNotes(
  userId: string,
  id: string,
  notes: string | null,
): Promise<WorkoutSession | null> {
  const session = findSession(userId, id);
  if (!session) return null;
  session.notes = notes;
  return session;
}

export async function deleteSession(userId: string, id: string): Promise<boolean> {
  const store = getStore(userId);
  if (!store.sessions.some((s) => s.id === id)) return false;
  store.sessions = store.sessions.filter((s) => s.id !== id);
  store.sets = store.sets.filter((s) => s.session_id !== id);
  return true;
}

export async function addSet(
  userId: string,
  sessionId: string,
  input: SetInput,
): Promise<AddSetResult> {
  if (!findSession(userId, sessionId)) return { ok: false, reason: "session_not_found" };
  const exercises = await listExercises(userId);
  if (!exercises.some((e) => e.id === input.exercise_id)) {
    return { ok: false, reason: "exercise_not_found" };
  }

  const store = getStore(userId);
  const inSession = store.sets.filter((s) => s.session_id === sessionId);
  const set: WorkoutSet = {
    id: crypto.randomUUID(),
    session_id: sessionId,
    exercise_id: input.exercise_id,
    set_number: nextSetNumber(inSession, input.exercise_id),
    reps: input.reps,
    weight_kg: input.weight_kg,
    rpe: input.rpe ?? null,
  };
  store.sets.push(set);
  return { ok: true, set };
}

export async function updateSet(
  userId: string,
  sessionId: string,
  setId: string,
  input: SetUpdateInput,
): Promise<WorkoutSet | null> {
  if (!findSession(userId, sessionId)) return null;
  const set = getStore(userId).sets.find((s) => s.id === setId && s.session_id === sessionId);
  if (!set) return null;
  set.reps = input.reps;
  set.weight_kg = input.weight_kg;
  set.rpe = input.rpe ?? null;
  return set;
}

/** Deletes a set and renumbers the remaining sets of that exercise. */
export async function deleteSet(userId: string, sessionId: string, setId: string): Promise<boolean> {
  if (!findSession(userId, sessionId)) return false;
  const store = getStore(userId);
  const target = store.sets.find((s) => s.id === setId && s.session_id === sessionId);
  if (!target) return false;

  store.sets = store.sets.filter((s) => s.id !== setId);
  store.sets
    .filter((s) => s.session_id === sessionId && s.exercise_id === target.exercise_id)
    .sort((a, b) => a.set_number - b.set_number)
    .forEach((s, i) => {
      s.set_number = i + 1;
    });
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
  const store = getStore(userId);
  return pickLastSets(store.sets, store.sessions, currentSessionId);
}
