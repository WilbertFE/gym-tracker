import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BattleStage } from "@/components/battle/battle-stage";
import { FeatureGate } from "@/components/feature-gate";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUserId } from "@/lib/auth";
import { loadLevel } from "@/lib/level";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "The season fight",
  description: "Watch this month's season boss as a turn based fight: every set you logged all month is a hit.",
  path: "/dashboard/season",
  keywords: ["season boss", "monthly boss", "workout game"],
});

async function SeasonFight() {
  const userId = await getCurrentUserId();
  const { seasonBattle, season, level, collection } = await loadLevel(userId);

  if (!seasonBattle || !season) {
    return <p className="system-window p-4 text-sm text-muted-foreground">The first season starts on 1 November 2026. Until then there is no season boss.</p>;
  }

  return (
    <BattleStage battle={seasonBattle} level={level.level} rank={level.rank} equipment={collection.equipment} gateName={`${season.gate.name}, the season boss`} />
  );
}

export default function SeasonFightPage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        label="Dashboard"
        title="The season fight"
        description="One awakened monster for the whole month. Every set you log all month is a hit, and beating it earns a Mythic chest."
      />

      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <FeatureGate id="gates">
          <SeasonFight />
        </FeatureGate>
      </Suspense>

      <nav aria-label="Related" className="flex flex-wrap gap-x-6">
        <Link href="/dashboard" className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          Back to the dashboard
        </Link>
        <Link href="/dashboard/gate" className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          This week&apos;s gate fight
        </Link>
      </nav>
    </main>
  );
}
