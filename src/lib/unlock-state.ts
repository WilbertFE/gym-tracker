import "server-only";
import { cookies } from "next/headers";
import { NO_RECOVERY_COOKIE, QUICK_CHESTS_COOKIE, SHOW_ALL_COOKIE } from "@/lib/feature-prefs";
import { isUnlocked, type FeatureId } from "@/lib/unlocks";

/** Whether the user turned on "Show all features" in Settings. */
export async function getShowAll(): Promise<boolean> {
  return (await cookies()).get(SHOW_ALL_COOKIE)?.value === "1";
}

/**
 * Whether the comeback quest is on. It is on unless the user switched it off in Settings. Outside a
 * request (tests, scripts) there are no cookies, and it is on.
 */
export async function getRecoveryEnabled(): Promise<boolean> {
  try {
    return (await cookies()).get(NO_RECOVERY_COOKIE)?.value !== "1";
  } catch {
    return true;
  }
}

/** Whether the user wants chests to open quickly, with a fade instead of the full animation. */
export async function getQuickChests(): Promise<boolean> {
  try {
    return (await cookies()).get(QUICK_CHESTS_COOKIE)?.value === "1";
  } catch {
    return false;
  }
}

/** Whether a feature is open for this user at this level. */
export async function featureOpen(id: FeatureId, level: number): Promise<boolean> {
  return isUnlocked(id, level, await getShowAll());
}
