import "server-only";
import type { CreateBoostResult } from "@/lib/repositories/types";
import type { XpBoost } from "@/lib/types";
import { getStore } from "./store";

export async function listBoosts(userId: string): Promise<XpBoost[]> {
  return [...getStore(userId).boosts].sort((a, b) => a.day.localeCompare(b.day));
}

export async function createBoost(userId: string, day: string): Promise<CreateBoostResult> {
  const store = getStore(userId);
  if (store.boosts.some((b) => b.day === day)) return { ok: false, reason: "already_boosted" };
  const boost: XpBoost = { id: crypto.randomUUID(), user_id: userId, day, created_at: new Date().toISOString() };
  store.boosts.push(boost);
  return { ok: true, boost };
}
