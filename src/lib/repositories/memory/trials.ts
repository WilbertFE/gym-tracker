import "server-only";
import { getStore } from "./store";

/** Ids of the ranks whose trial this user cleared. `available` is false only when the table does not exist yet. */
export async function listClearedTrials(userId: string): Promise<{ available: boolean; ids: string[] }> {
  return { available: true, ids: [...getStore(userId).trials] };
}

export async function clearTrial(userId: string, rankId: string): Promise<void> {
  const store = getStore(userId);
  if (!store.trials.includes(rankId)) store.trials.push(rankId);
}
