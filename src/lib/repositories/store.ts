import "server-only";
import { addDays, format, subDays } from "date-fns";
import { DEMO_USER_ID } from "@/lib/demo";
import { ISO_FORMAT } from "@/lib/dates";
import { builtInId } from "@/lib/exercise-library";
import type {
  Checkin,
  Exercise,
  Membership,
  WeightLog,
  WorkoutSession,
  WorkoutSet,
} from "@/lib/types";

/**
 * In-memory dummy store used until Supabase is connected. Only the repository
 * files in this folder touch it. Replace their bodies with Supabase queries
 * and delete this file when the database is ready.
 */
export type Store = {
  checkins: Checkin[];
  weights: WeightLog[];
  memberships: Membership[];
  /** The user's own exercises. Built-ins live in exercise-library.ts. */
  exercises: Exercise[];
  sessions: WorkoutSession[];
  sets: WorkoutSet[];
};

const g = globalThis as unknown as { __gymStore?: Map<string, Store> };
const stores = (g.__gymStore ??= new Map<string, Store>());

const iso = (d: Date) => format(d, ISO_FORMAT);

/** [exercise name, [reps, kg] per set] */
type Plan = [string, [number, number][]][];

function seedWorkouts(userId: string, now: Date) {
  const sessions: WorkoutSession[] = [];
  const sets: WorkoutSet[] = [];

  const add = (daysAgo: number, minutes: number, plan: Plan) => {
    const start = subDays(now, daysAgo);
    start.setHours(18, 0, 0, 0);
    const end = new Date(start.getTime() + minutes * 60_000);
    const id = crypto.randomUUID();
    sessions.push({
      id,
      user_id: userId,
      date: iso(start),
      started_at: start.toISOString(),
      ended_at: end.toISOString(),
      duration_minutes: minutes,
      notes: null,
    });
    for (const [name, work] of plan) {
      work.forEach(([reps, weight_kg], i) =>
        sets.push({
          id: crypto.randomUUID(),
          session_id: id,
          exercise_id: builtInId(name),
          set_number: i + 1,
          reps,
          weight_kg,
          rpe: null,
        }),
      );
    }
  };

  add(2, 62, [
    ["Barbell Bench Press", [[8, 60], [8, 60], [6, 62.5], [6, 62.5]]],
    ["Incline Dumbbell Press", [[10, 22], [10, 22], [8, 24]]],
    ["Lateral Raise", [[12, 8], [12, 8], [12, 8]]],
    ["Tricep Pushdown", [[12, 25], [12, 25], [10, 27.5]]],
  ]);
  add(4, 55, [
    ["Pull Up", [[8, 0], [7, 0], [6, 0]]],
    ["Barbell Row", [[8, 50], [8, 50], [8, 52.5]]],
    ["Lat Pulldown", [[10, 45], [10, 45], [10, 47.5]]],
    ["Barbell Curl", [[10, 25], [10, 25], [8, 27.5]]],
  ]);
  add(7, 70, [
    ["Barbell Back Squat", [[8, 80], [8, 80], [8, 82.5], [6, 85]]],
    ["Romanian Deadlift", [[10, 70], [10, 70], [10, 70]]],
    ["Leg Press", [[12, 140], [12, 140], [10, 150]]],
    ["Standing Calf Raise", [[15, 60], [15, 60], [15, 60]]],
  ]);

  return { sessions, sets };
}

function seed(userId: string): Store {
  const now = new Date();
  // Today is skipped on purpose so the check-in form starts empty.
  const checkinOffsets = [1, 2, 4, 5, 6, 8, 9];
  const checkins: Checkin[] = checkinOffsets.map((o, i) => ({
    id: crypto.randomUUID(),
    user_id: userId,
    date: iso(subDays(now, o)),
    went_to_gym: i % 3 !== 0,
    mood: 3 + (i % 3),
    energy: 2 + (i % 4),
    sleep_hours: 6 + (i % 3) * 0.5,
    notes: null,
  }));

  const weights: WeightLog[] = Array.from({ length: 10 }, (_, i) => ({
    id: crypto.randomUUID(),
    user_id: userId,
    date: iso(subDays(now, (9 - i) * 7)),
    weight_kg: Math.round((72.4 - i * 0.35 + (i % 2) * 0.3) * 10) / 10,
    notes: null,
  }));

  const memberships: Membership[] = [
    {
      id: crypto.randomUUID(),
      user_id: userId,
      gym_name: "Demo Fitness Club",
      start_date: iso(subDays(now, 70)),
      end_date: iso(addDays(now, 18)),
      price: 350000,
      notes: null,
    },
  ];

  const { sessions, sets } = seedWorkouts(userId, now);
  return { checkins, weights, memberships, exercises: [], sessions, sets };
}

const empty = (): Store => ({
  checkins: [],
  weights: [],
  memberships: [],
  exercises: [],
  sessions: [],
  sets: [],
});

export function getStore(userId: string): Store {
  let store = stores.get(userId);
  if (!store) {
    store = userId === DEMO_USER_ID ? seed(userId) : empty();
    stores.set(userId, store);
  }
  return store;
}

/** Test helper. */
export function resetStores() {
  stores.clear();
}
