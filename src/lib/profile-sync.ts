import "server-only";
import { buildSnapshot, type ProfileSnapshot } from "@/lib/profile";
import { loadLevel } from "@/lib/level";
import { getProfile, saveSnapshot } from "@/lib/repositories/profiles";

/** What a profile can show right now, worked out from the user's own data. */
export async function liveSnapshot(userId: string): Promise<ProfileSnapshot> {
  const game = await loadLevel(userId);
  return buildSnapshot({
    levelNumber: game.level.level,
    xp: game.level.total,
    title: game.title,
    stats: game.stats,
    titles: game.titles,
    owned: game.collection.owned,
    equipment: game.collection.equipment,
    muscles: game.muscles,
    activity: game.activity,
    firstDate: game.xp.firstDate,
  });
}

/**
 * Brings the stored snapshot of a user's profile up to date. The browser never sends it: it is worked out
 * here from the user's own data. Does nothing for a user without a profile.
 */
export async function syncProfileSnapshot(userId: string): Promise<boolean> {
  const { profile } = await getProfile(userId);
  if (!profile) return false;
  await saveSnapshot(userId, await liveSnapshot(userId));
  return true;
}
