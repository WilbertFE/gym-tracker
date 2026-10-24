import "server-only";
import type { CheckinInput } from "@/lib/validation/checkin";
import type { Checkin } from "@/lib/types";
import { getStore, removeLogPhotosFor } from "./store";

export async function listCheckins(userId: string): Promise<Checkin[]> {
  return [...getStore(userId).checkins].sort((a, b) => b.date.localeCompare(a.date));
}

/** One check-in per user per day: saving the same date replaces the entry. */
export async function upsertCheckin(userId: string, input: CheckinInput): Promise<Checkin> {
  const store = getStore(userId);
  const existing = store.checkins.find((c) => c.date === input.date);
  const row: Checkin = {
    id: existing?.id ?? crypto.randomUUID(),
    user_id: userId,
    date: input.date,
    went_to_gym: input.went_to_gym,
    mood: input.mood ?? null,
    energy: input.energy ?? null,
    sleep_hours: input.sleep_hours ?? null,
    notes: input.notes ?? null,
  };
  store.checkins = [...store.checkins.filter((c) => c.date !== input.date), row];
  return row;
}

export async function deleteCheckin(userId: string, id: string): Promise<boolean> {
  const store = getStore(userId);
  const before = store.checkins.length;
  store.checkins = store.checkins.filter((c) => c.id !== id);
  const deleted = store.checkins.length < before;
  if (deleted) removeLogPhotosFor(store, "checkin", id);
  return deleted;
}
