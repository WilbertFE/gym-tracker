import "server-only";
import type { WeightInput } from "@/lib/validation/weight";
import type { WeightLog } from "@/lib/types";
import { getStore, removeLogPhotosFor } from "./store";

export async function listWeights(userId: string): Promise<WeightLog[]> {
  return [...getStore(userId).weights].sort((a, b) => b.date.localeCompare(a.date));
}

export async function createWeight(userId: string, input: WeightInput): Promise<WeightLog> {
  const row: WeightLog = {
    id: crypto.randomUUID(),
    user_id: userId,
    date: input.date,
    weight_kg: input.weight_kg,
    notes: input.notes ?? null,
  };
  getStore(userId).weights.push(row);
  return row;
}

export async function updateWeight(
  userId: string,
  id: string,
  input: WeightInput,
): Promise<WeightLog | null> {
  const store = getStore(userId);
  const idx = store.weights.findIndex((w) => w.id === id);
  if (idx === -1) return null;
  const row: WeightLog = {
    ...store.weights[idx],
    date: input.date,
    weight_kg: input.weight_kg,
    notes: input.notes ?? null,
  };
  store.weights[idx] = row;
  return row;
}

export async function deleteWeight(userId: string, id: string): Promise<boolean> {
  const store = getStore(userId);
  const before = store.weights.length;
  store.weights = store.weights.filter((w) => w.id !== id);
  const deleted = store.weights.length < before;
  if (deleted) removeLogPhotosFor(store, "weight", id);
  return deleted;
}
