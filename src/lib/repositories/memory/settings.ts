import "server-only";
import { DEFAULT_SETTINGS } from "@/lib/settings-defaults";
import type { UserSettings } from "@/lib/types";
import type { SettingsInput } from "@/lib/validation/settings";
import { getStore } from "./store";

export async function getSettings(userId: string): Promise<UserSettings> {
  return getStore(userId).settings ?? { user_id: userId, ...DEFAULT_SETTINGS };
}

export async function saveSettings(userId: string, input: SettingsInput): Promise<UserSettings> {
  const row: UserSettings = { user_id: userId, ...input };
  getStore(userId).settings = row;
  return row;
}
