import "server-only";
import type { Chest, Opening } from "@/lib/chests";
import type { Equipment } from "@/lib/items";
import type { RecordOpeningResult } from "@/lib/repositories/types";
import { getStore } from "./store";

/** The opened chests. `available` is false only when the table does not exist yet. */
export async function listOpenings(userId: string): Promise<{ available: boolean; openings: Opening[] }> {
  return { available: true, openings: [...getStore(userId).chestOpenings] };
}

/** A chest can be opened once: a second try for the same chest id is refused. */
export async function recordOpening(userId: string, input: Omit<Opening, "opened_at">): Promise<RecordOpeningResult> {
  const store = getStore(userId);
  if (store.chestOpenings.some((o) => o.chest_id === input.chest_id)) return { ok: false, reason: "already_opened" };
  const opening: Opening = { ...input, opened_at: new Date().toISOString() };
  store.chestOpenings.push(opening);
  return { ok: true, opening };
}

export async function getEquipment(userId: string): Promise<Equipment> {
  return { ...getStore(userId).equipment };
}

export async function setEquipment(userId: string, equipment: Equipment): Promise<void> {
  getStore(userId).equipment = { ...equipment };
}

/** Demo mode only: a few chests that are already waiting, so the opening can be tried straight away. */
export async function listExtraChests(userId: string): Promise<Chest[]> {
  return [...getStore(userId).demoChests];
}
