import "server-only";
import type { Chest, Opening } from "@/lib/chests";
import { NO_EQUIPMENT, SLOTS, type Equipment } from "@/lib/items";
import type { RecordOpeningResult } from "@/lib/repositories/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { check, fetchAll, getDb, isUniqueViolation, isUuid } from "./db";

const COLUMNS = "chest_id,item_id,grade,duplicate,bonus_xp,opened_at,opened_on";

/** Postgres "undefined table" and PostgREST "not in the schema cache": the migration has not run yet. */
const isMissingTable = (error: { code?: string } | null) => error?.code === "42P01" || error?.code === "PGRST205";

/**
 * The opened chests. Until the migration has run, `available` is false and the game shows no chests at all,
 * so nobody is offered a chest that could not be saved.
 */
export async function listOpenings(userId: string): Promise<{ available: boolean; openings: Opening[] }> {
  if (!isUuid(userId)) return { available: false, openings: [] };
  const db = await getDb();
  try {
    const rows = await fetchAll((from, to) =>
      db.from("chest_openings").select(COLUMNS).eq("user_id", userId).order("opened_at").range(from, to),
    );
    return { available: true, openings: rows as unknown as Opening[] };
  } catch (error) {
    if (isMissingTable(error as { code?: string }) || /chest_openings/.test(String((error as Error).message))) {
      return { available: false, openings: [] };
    }
    throw error;
  }
}

/** Writes an opened chest. Only the server can, with the service role. The primary key stops a second opening. */
export async function recordOpening(userId: string, input: Omit<Opening, "opened_at">): Promise<RecordOpeningResult> {
  if (!isUuid(userId)) return { ok: false, reason: "unavailable" };
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("chest_openings")
    .insert({ user_id: userId, ...input })
    .select(COLUMNS)
    .single();
  if (isUniqueViolation(error)) return { ok: false, reason: "already_opened" };
  if (isMissingTable(error)) return { ok: false, reason: "unavailable" };
  check(error);
  return { ok: true, opening: data as unknown as Opening };
}

export async function getEquipment(userId: string): Promise<Equipment> {
  if (!isUuid(userId)) return { ...NO_EQUIPMENT };
  const db = await getDb();
  const { data, error } = await db.from("equipment").select("frame,aura,plate,look").eq("user_id", userId).maybeSingle();
  if (isMissingTable(error)) return { ...NO_EQUIPMENT };
  check(error);
  const row = (data ?? {}) as Partial<Equipment>;
  return Object.fromEntries(SLOTS.map((s) => [s.id, row[s.id] ?? null])) as Equipment;
}

/** Saves what is worn. Written with the service role, after the caller checked that the items are owned. */
export async function setEquipment(userId: string, equipment: Equipment): Promise<void> {
  if (!isUuid(userId)) return;
  const admin = createAdminClient();
  const { error } = await admin
    .from("equipment")
    .upsert({ user_id: userId, ...equipment, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (isMissingTable(error)) return;
  check(error);
}

/** Only the demo backend has extra chests. */
export async function listExtraChests(): Promise<Chest[]> {
  return [];
}
