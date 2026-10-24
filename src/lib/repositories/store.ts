import "server-only";
import { addDays, format, subDays } from "date-fns";
import { DEMO_USER_ID } from "@/lib/demo";
import { ISO_FORMAT } from "@/lib/dates";
import type { Checkin, Membership, WeightLog } from "@/lib/types";

/**
 * In-memory dummy store used until Supabase is connected. Only the repository
 * files in this folder touch it. Replace their bodies with Supabase queries
 * and delete this file when the database is ready.
 */
export type Store = {
  checkins: Checkin[];
  weights: WeightLog[];
  memberships: Membership[];
};

const g = globalThis as unknown as { __gymStore?: Map<string, Store> };
const stores = (g.__gymStore ??= new Map<string, Store>());

const iso = (d: Date) => format(d, ISO_FORMAT);

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

  return { checkins, weights, memberships };
}

export function getStore(userId: string): Store {
  let store = stores.get(userId);
  if (!store) {
    store =
      userId === DEMO_USER_ID
        ? seed(userId)
        : { checkins: [], weights: [], memberships: [] };
    stores.set(userId, store);
  }
  return store;
}

/** Test helper. */
export function resetStores() {
  stores.clear();
}
