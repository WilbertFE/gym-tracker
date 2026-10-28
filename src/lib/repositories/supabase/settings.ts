import "server-only";
import { DEFAULT_SETTINGS } from "@/lib/settings-defaults";
import type { UserSettings } from "@/lib/types";
import type { SettingsInput } from "@/lib/validation/settings";
import { check, getDb } from "./db";

const COLUMNS = "user_id,country,weight_unit,currency";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toSettings = (r: any): UserSettings => ({
  user_id: r.user_id,
  country: r.country,
  weight_unit: r.weight_unit,
  currency: r.currency,
});

/** A user with no row yet gets the defaults. */
export async function getSettings(userId: string): Promise<UserSettings> {
  const db = await getDb();
  const { data, error } = await db.from("user_settings").select(COLUMNS).eq("user_id", userId).maybeSingle();
  check(error);
  return data ? toSettings(data) : { user_id: userId, ...DEFAULT_SETTINGS };
}

export async function saveSettings(userId: string, input: SettingsInput): Promise<UserSettings> {
  const db = await getDb();
  const { data, error } = await db
    .from("user_settings")
    .upsert({ user_id: userId, ...input, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    .select(COLUMNS)
    .single();
  check(error);
  return toSettings(data);
}
