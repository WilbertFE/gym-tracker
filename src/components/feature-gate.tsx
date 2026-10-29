import type { ReactNode } from "react";
import { LockedFeature } from "@/components/locked-feature";
import { getCurrentUserId } from "@/lib/auth";
import { loadLevel } from "@/lib/level";
import { isUnlocked, type FeatureId } from "@/lib/unlocks";
import { getShowAll } from "@/lib/unlock-state";

/**
 * Shows its children once a feature is open, and the locked teaser (what it is, the level that opens it and how
 * far away that is) until then. "Show all features" in Settings opens everything. Put it inside a Suspense boundary,
 * since it reads the signed in user.
 */
export async function FeatureGate({ id, children }: { id: FeatureId; children: ReactNode }) {
  const userId = await getCurrentUserId();
  const [{ level }, showAll] = await Promise.all([loadLevel(userId), getShowAll()]);
  if (!isUnlocked(id, level.level, showAll)) {
    return <LockedFeature id={id} level={level.level} totalXp={level.total} />;
  }
  return <>{children}</>;
}
