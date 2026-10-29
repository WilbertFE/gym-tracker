import { LockSimpleIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { featureById, type FeatureId } from "@/lib/unlocks";
import { xpForLevel } from "@/lib/xp";

/**
 * What a page shows before its feature has opened: what it is, the level that opens it and how far
 * away that is. Better than a blank page or an error, and a reason to keep going.
 */
export function LockedFeature({ id, level, totalXp }: { id: FeatureId; level: number; totalXp: number }) {
  const feature = featureById(id);
  const away = Math.max(0, xpForLevel(feature.level) - totalXp);

  return (
    <section aria-label={`${feature.name}, locked`} className="system-window flex flex-col items-center gap-4 p-8 text-center" data-glow>
      <span aria-hidden className="flex size-16 items-center justify-center border border-primary/60 text-primary shadow-[0_0_18px_-4px_var(--primary)]">
        <LockSimpleIcon className="size-8" />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">{feature.name}</h2>
        <p className="text-sm text-muted-foreground">{feature.blurb}</p>
      </div>
      <p className="tabular text-sm">
        Opens at level <span className="text-primary">{feature.level}</span>. You are level {level}, {away.toLocaleString("en-US")} XP away.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex min-h-11 items-center border px-4 text-sm hover:border-primary"
      >
        Back to the dashboard
      </Link>
    </section>
  );
}
