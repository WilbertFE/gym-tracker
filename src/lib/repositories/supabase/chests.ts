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

/** The slots that existed before the weapon and outfit slots, and the ones the gear migration added. */
const OLD_SLOTS = ["frame", "aura", "plate", "look"] as const;
const NEW_SLOTS = ["weapon", "outfit"] as const;
/** The gear migration adds the weapon and outfit columns. Until it has run, those two slots are left out instead of failing. */
const isMissingGearColumn = (error: { message?: string } | null) => /weapon|outfit/.test(error?.message ?? "");
let hasGearColumns = true;

export async function getEquipment(userId: string): Promise<Equipment> {
  if (!isUuid(userId)) return { ...NO_EQUIPMENT };
  const db = await getDb();
  const read = (columns: readonly string[]) => db.from("equipment").select(columns.join(",")).eq("user_id", userId).maybeSingle();
  let { data, error } = await read(hasGearColumns ? [...OLD_SLOTS, ...NEW_SLOTS] : OLD_SLOTS);
  if (hasGearColumns && isMissingGearColumn(error)) {
    hasGearColumns = false;
    ({ data, error } = await read(OLD_SLOTS));
  }
  if (isMissingTable(error)) return { ...NO_EQUIPMENT };
  check(error);
  const row = (data ?? {}) as Partial<Equipment>;
  return Object.fromEntries(SLOTS.map((s) => [s.id, row[s.id] ?? null])) as Equipment;
}

/** Saves what is worn. Written with the service role, after the caller checked that the items are owned. */
export async function setEquipment(userId: string, equipment: Equipment): Promise<void> {
  if (!isUuid(userId)) return;
  const admin = createAdminClient();
  const save = (row: Partial<Equipment>) =>
    admin.from("equipment").upsert({ user_id: userId, ...row, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  const rest = Object.fromEntries(Object.entries(equipment).filter(([slot]) => !(NEW_SLOTS as readonly string[]).includes(slot))) as Partial<Equipment>;
  let { error } = await save(hasGearColumns ? equipment : rest);
  if (hasGearColumns && isMissingGearColumn(error)) {
    hasGearColumns = false;
    ({ error } = await save(rest));
  }
  if (isMissingTable(error)) return;
  check(error);
}

/** Only the demo backend has extra chests. */
export async function listExtraChests(): Promise<Chest[]> {
  return [];
}
