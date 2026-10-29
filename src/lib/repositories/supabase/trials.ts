import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { check, getDb, isUuid } from "./db";

/** Postgres "undefined table" and PostgREST "not in the schema cache": the migration has not run yet. */
const isMissingTable = (error: { code?: string } | null) => error?.code === "42P01" || error?.code === "PGRST205";

/**
 * Ids of the ranks whose trial this user cleared. Until the migration has run, `available` is false and
 * the game does not hold anyone back, so nobody is stuck behind a trial that cannot be saved.
 */
export async function listClearedTrials(userId: string): Promise<{ available: boolean; ids: string[] }> {
  if (!isUuid(userId)) return { available: false, ids: [] };
  const db = await getDb();
  const { data, error } = await db.from("rank_trials").select("rank_id").eq("user_id", userId);
  if (isMissingTable(error)) return { available: false, ids: [] };
  check(error);
  return { available: true, ids: (data ?? []).map((r: { rank_id: string }) => r.rank_id) };
}

/** Records a cleared trial. Written with the service role, the only way a row can be added. */
export async function clearTrial(userId: string, rankId: string): Promise<void> {
  if (!isUuid(userId)) return;
  const admin = createAdminClient();
  const { error } = await admin.from("rank_trials").upsert({ user_id: userId, rank_id: rankId }, { onConflict: "user_id,rank_id" });
  if (isMissingTable(error)) return;
  check(error);
}
