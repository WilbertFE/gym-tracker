import "server-only";
import type { BodyMeasurement } from "@/lib/types";
import type { MeasurementInput } from "@/lib/validation/progress";
import { getStore } from "./store";

/** Newest first. */
export async function listMeasurements(userId: string): Promise<BodyMeasurement[]> {
  return [...getStore(userId).measurements].sort((a, b) => b.date.localeCompare(a.date));
}

/** One entry per user per day: saving the same date replaces the entry. */
export async function upsertMeasurement(
  userId: string,
  input: MeasurementInput,
): Promise<BodyMeasurement> {
  const store = getStore(userId);
  const existing = store.measurements.find((m) => m.date === input.date);
  const row: BodyMeasurement = {
    id: existing?.id ?? crypto.randomUUID(),
    user_id: userId,
    date: input.date,
    chest_cm: input.chest_cm ?? null,
    waist_cm: input.waist_cm ?? null,
    hips_cm: input.hips_cm ?? null,
    arm_cm: input.arm_cm ?? null,
    thigh_cm: input.thigh_cm ?? null,
    body_fat_pct: input.body_fat_pct ?? null,
  };
  store.measurements = [...store.measurements.filter((m) => m.date !== input.date), row];
  return row;
}

export async function deleteMeasurement(userId: string, id: string): Promise<boolean> {
  const store = getStore(userId);
  const before = store.measurements.length;
  store.measurements = store.measurements.filter((m) => m.id !== id);
  return store.measurements.length < before;
}
