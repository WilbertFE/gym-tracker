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
  title: "The gate fight",
  description: "Watch this week's gate as a turn based fight: every set you logged is a hit on the monster.",
  path: "/dashboard/gate",
  keywords: ["weekly gate", "boss fight", "workout game"],
});

async function GateFight() {
  const userId = await getCurrentUserId();
  const { battle, gate, level, collection } = await loadLevel(userId);

  if (!battle) {
    return (
      <p className="system-window p-4 text-sm text-muted-foreground">
        This week&apos;s gate is rank {gate.gate.rank.letter}, guarded by {gate.gate.boss}, whose fight is not made yet. For now only the rank E gate has a monster to fight. The gate itself works as always: every set you log hurts the boss.
      </p>
    );
  }

  return <BattleStage battle={battle} level={level.level} rank={level.rank} equipment={collection.equipment} gateName={`${gate.gate.name}, rank ${gate.gate.rank.letter}`} />;
}

export default function GateFightPage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        label="Dashboard"
        title="The gate fight"
        description="Every set you log is a hit on this week's monster, in the order you did them. Your stats from earlier training make each hit stronger."
      />

      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <FeatureGate id="gates">
          <GateFight />
        </FeatureGate>
      </Suspense>

      <nav aria-label="Related">
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Back to the dashboard
        </Link>
      </nav>
    </main>
  );
}
