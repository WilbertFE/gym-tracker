import "server-only";
import { cookies } from "next/headers";
import { SHOW_ALL_COOKIE } from "@/lib/feature-prefs";
import { isUnlocked, type FeatureId } from "@/lib/unlocks";

/** Whether the user turned on "Show all features" in Settings. */
export async function getShowAll(): Promise<boolean> {
  return (await cookies()).get(SHOW_ALL_COOKIE)?.value === "1";
}

/** Whether a feature is open for this user at this level. */
export async function featureOpen(id: FeatureId, level: number): Promise<boolean> {
  return isUnlocked(id, level, await getShowAll());
}
