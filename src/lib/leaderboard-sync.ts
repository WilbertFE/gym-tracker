import "server-only";
import { todayISO } from "@/lib/dates";
import { boardXp, currentWeekStart } from "@/lib/leaderboard";
import { itemById } from "@/lib/items";
import { loadLevel } from "@/lib/level";
import { getEntry, upsertEntry } from "@/lib/repositories/leaderboard";
import { getSettings } from "@/lib/repositories/settings";
import type { UpsertEntryResult } from "@/lib/repositories/types";

/**
 * Works out a user's board score on the server, from their own data, and writes it. The browser never
 * sends a score, only a request to recompute it, so it cannot be set to anything else.
 */
export async function writeEntry(userId: string, displayName: string): Promise<UpsertEntryResult> {
  const today = todayISO();
  const [{ xp, level, title, collection }, settings] = await Promise.all([loadLevel(userId), getSettings(userId)]);
  const score = boardXp(xp, today);
  return upsertEntry(userId, {
    display_name: displayName,
    country: settings.country,
    total_xp: score.total,
    week_xp: score.week,
    week_start: currentWeekStart(today),
    level: level.level,
    title,
    // Only the word of the worn nameplate is public, never which item it was.
    plate: collection.equipment.plate ? (itemById(collection.equipment.plate)?.value ?? null) : null,
  });
}

/** Refreshes the score of a user who has joined. Does nothing for a user who has not. */
export async function syncLeaderboardEntry(userId: string): Promise<boolean> {
  const existing = await getEntry(userId);
  if (!existing) return false;
  const result = await writeEntry(userId, existing.display_name);
  return result.ok;
}
