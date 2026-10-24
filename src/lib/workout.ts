import type { Exercise, WorkoutSession, WorkoutSet } from "@/lib/types";

/** Whole minutes between start and end, at least 1 so a finished workout is never 0. */
export function computeDurationMinutes(startedAt: string, endedAt: string): number {
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  return Math.max(1, Math.round(ms / 60_000));
}

/** Total volume in kg: sum of reps times weight. Bodyweight sets (0 kg) add nothing. */
export function sessionVolume(sets: Pick<WorkoutSet, "reps" | "weight_kg">[]): number {
  return sets.reduce((sum, s) => sum + s.reps * s.weight_kg, 0);
}

/** Next set number for an exercise within one session (1 based). */
export function nextSetNumber(sets: WorkoutSet[], exerciseId: string): number {
  return sets.filter((s) => s.exercise_id === exerciseId).length + 1;
}

export type ExerciseGroup = {
  exercise: Exercise | null;
  exercise_id: string;
  sets: WorkoutSet[];
};

/**
 * Groups sets by exercise in order of first appearance, sets ordered by set
 * number. `exercise` is null if the exercise no longer exists.
 */
export function groupSetsByExercise(
  sets: WorkoutSet[],
  exercises: Exercise[],
): ExerciseGroup[] {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const groups = new Map<string, ExerciseGroup>();
  for (const set of sets) {
    let group = groups.get(set.exercise_id);
    if (!group) {
      group = {
        exercise: byId.get(set.exercise_id) ?? null,
        exercise_id: set.exercise_id,
        sets: [],
      };
      groups.set(set.exercise_id, group);
    }
    group.sets.push(set);
  }
  for (const g of groups.values()) g.sets.sort((a, b) => a.set_number - b.set_number);
  return [...groups.values()];
}

/** "1h 05m" style, or "42m". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

/** "1:05:09" or "05:09" for the live timer. */
export function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Most recent reps and weight per exercise, used to prefill the set logger. A
 * set from the current session beats any earlier session; otherwise the newest
 * session wins, and within a session the highest set number.
 */
export function pickLastSets(
  sets: WorkoutSet[],
  sessions: Pick<WorkoutSession, "id" | "started_at">[],
  currentSessionId: string,
): Record<string, { reps: number; weight_kg: number }> {
  const startedAt = new Map(sessions.map((s) => [s.id, s.started_at]));
  const rank = (s: WorkoutSet) =>
    `${s.session_id === currentSessionId ? "9" : "0"}|${startedAt.get(s.session_id) ?? ""}|${String(s.set_number).padStart(4, "0")}`;

  const best = new Map<string, WorkoutSet>();
  for (const s of sets) {
    const cur = best.get(s.exercise_id);
    if (!cur || rank(s) > rank(cur)) best.set(s.exercise_id, s);
  }
  return Object.fromEntries(
    [...best].map(([id, s]) => [id, { reps: s.reps, weight_kg: s.weight_kg }]),
  );
}
