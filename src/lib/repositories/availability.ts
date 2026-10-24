import "server-only";
import { toMinutes, WEEKDAY_ORDER } from "@/lib/scheduling";
import type { AvailabilityBlock } from "@/lib/types";
import type { AvailabilityInput } from "@/lib/validation/availability";
import { getStore } from "./store";

const dayRank = (weekday: number) => WEEKDAY_ORDER.indexOf(weekday as (typeof WEEKDAY_ORDER)[number]);

/** Monday first, then by start time. */
export async function listAvailability(userId: string): Promise<AvailabilityBlock[]> {
  return [...getStore(userId).availability].sort(
    (a, b) => dayRank(a.weekday) - dayRank(b.weekday) || toMinutes(a.start_time) - toMinutes(b.start_time),
  );
}

export async function createAvailability(
  userId: string,
  input: AvailabilityInput,
): Promise<AvailabilityBlock> {
  const row: AvailabilityBlock = {
    id: crypto.randomUUID(),
    user_id: userId,
    weekday: input.weekday,
    start_time: input.start_time,
    end_time: input.end_time,
    label: input.label || null,
  };
  getStore(userId).availability.push(row);
  return row;
}

export async function updateAvailability(
  userId: string,
  id: string,
  input: AvailabilityInput,
): Promise<AvailabilityBlock | null> {
  const store = getStore(userId);
  const idx = store.availability.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  const row: AvailabilityBlock = {
    ...store.availability[idx],
    weekday: input.weekday,
    start_time: input.start_time,
    end_time: input.end_time,
    label: input.label || null,
  };
  store.availability[idx] = row;
  return row;
}

export async function deleteAvailability(userId: string, id: string): Promise<boolean> {
  const store = getStore(userId);
  const before = store.availability.length;
  store.availability = store.availability.filter((b) => b.id !== id);
  return store.availability.length < before;
}
