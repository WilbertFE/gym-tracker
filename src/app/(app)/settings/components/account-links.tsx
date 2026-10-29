import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth";
import { loadLevel } from "@/lib/level";
import { isUnlocked } from "@/lib/unlocks";
import { getShowAll } from "@/lib/unlock-state";

/** Links to the other account pages that are open yet. Membership opens with its level. */
export async function AccountLinks() {
  const userId = await getCurrentUserId();
  const [{ level }, showAll] = await Promise.all([loadLevel(userId), getShowAll()]);
  if (!isUnlocked("membership", level.level, showAll)) return null;

  return (
    <nav aria-label="Account pages">
      <Link
        href="/membership"
        className="flex min-h-12 items-center justify-between border border-primary/25 bg-card px-4 text-sm hover:border-primary/60 hover:bg-surface-raised"
      >
        Gym membership
        <span aria-hidden className="text-muted-foreground">&rarr;</span>
      </Link>
    </nav>
  );
}
