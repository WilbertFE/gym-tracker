import "server-only";
import type { MembershipInput } from "@/lib/validation/membership";
import type { Membership } from "@/lib/types";
import { getStore } from "./store";

/** Newest membership first (by end date). */
export async function listMemberships(userId: string): Promise<Membership[]> {
  return [...getStore(userId).memberships].sort((a, b) =>
    b.end_date.localeCompare(a.end_date),
  );
}

export async function createMembership(
  userId: string,
  input: MembershipInput,
): Promise<Membership> {
  const row: Membership = {
    id: crypto.randomUUID(),
    user_id: userId,
    gym_name: input.gym_name,
    location: input.location || null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    start_date: input.start_date,
    end_date: input.end_date,
    price: input.price ?? null,
    notes: input.notes ?? null,
  };
  getStore(userId).memberships.push(row);
  return row;
}

export async function updateMembership(
  userId: string,
  id: string,
  input: MembershipInput,
): Promise<Membership | null> {
  const store = getStore(userId);
  const idx = store.memberships.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  const row: Membership = {
    ...store.memberships[idx],
    gym_name: input.gym_name,
    location: input.location || null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    start_date: input.start_date,
    end_date: input.end_date,
    price: input.price ?? null,
    notes: input.notes ?? null,
  };
  store.memberships[idx] = row;
  return row;
}

export async function deleteMembership(userId: string, id: string): Promise<boolean> {
  const store = getStore(userId);
  const before = store.memberships.length;
  store.memberships = store.memberships.filter((m) => m.id !== id);
  return store.memberships.length < before;
}
