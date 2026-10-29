import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FeatureGate } from "@/components/feature-gate";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { buildMetadata } from "@/lib/metadata";
import { SectionTabs } from "@/components/section-tabs";
import { HeatmapPanel } from "./components/heatmap-panel";
import { WeightPanel } from "./components/weight-panel";

export const metadata: Metadata = buildMetadata({
  title: "Body",
  description: "Muscle heatmap of your training, plus body weight tracking over time.",
  path: "/body",
  keywords: ["muscle heatmap", "body weight", "training volume"],
});

export default function BodyPage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        label="Body"
        title="Body"
        description="See which muscles you have trained, or log your weight."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <FeatureGate id="body">
      <SectionTabs
        label="Body views"
        tour="body-tabs"
        tabs={[
          {
            value: "muscles",
            label: "Muscles",
            content: (
              <Suspense fallback={<Skeleton className="h-[40rem] w-full" />}>
                <HeatmapPanel />
              </Suspense>
            ),
          },
          {
            value: "weight",
            label: "Weight",
            content: (
              <Suspense fallback={<Skeleton className="h-[40rem] w-full" />}>
                <WeightPanel />
              </Suspense>
            ),
          },
        ]}
      />
      <nav aria-label="Physique tools" data-tour="progress-link">
        <Link
          href="/body/progress"
          className="flex min-h-12 items-center justify-between border border-primary/25 bg-card px-4 text-sm hover:border-primary/60 hover:bg-surface-raised"
        >
          Progress photos and measurements
          <span aria-hidden className="text-muted-foreground">&rarr;</span>
        </Link>
      </nav>
        </FeatureGate>
      </Suspense>
    </main>
  );
}
