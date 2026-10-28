import "server-only";
import type { CreateBoostResult } from "@/lib/repositories/types";
import type { XpBoost } from "@/lib/types";
import { check, fetchAll, getDb, isUniqueViolation } from "./db";

const COLUMNS = "id,user_id,day,created_at";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toBoost = (r: any): XpBoost => ({ id: r.id, user_id: r.user_id, day: r.day, created_at: r.created_at });

/** Postgres "undefined table" and PostgREST "table not in the schema cache": the migration has not run yet. */
const TABLE_MISSING = new Set(["42P01", "PGRST205"]);

export async function listBoosts(userId: string): Promise<XpBoost[]> {
  const db = await getDb();
  try {
    const rows = await fetchAll((from, to) =>
      db.from("xp_boosts").select(COLUMNS).eq("user_id", userId).order("day").range(from, to),
    );
    return rows.map(toBoost);
  } catch (error) {
    // Boosters are an extra. Until their table exists the level still has to load, with none used.
    if (TABLE_MISSING.has((error as { code?: string }).code ?? "") || /xp_boosts/.test(String((error as Error).message))) {
      return [];
    }
    throw error;
  }
}

/** One booster per day: a second one on the same day hits the unique index. */
export async function createBoost(userId: string, day: string): Promise<CreateBoostResult> {
  const db = await getDb();
  const { data, error } = await db.from("xp_boosts").insert({ user_id: userId, day }).select(COLUMNS).single();
  if (isUniqueViolation(error)) return { ok: false, reason: "already_boosted" };
  check(error);
  return { ok: true, boost: toBoost(data) };
}
