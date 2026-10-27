import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { buildMetadata } from "@/lib/metadata";
import { BodyTabs } from "./components/body-tabs";
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
      <BodyTabs
        muscles={
          <Suspense fallback={<Skeleton className="h-[40rem] w-full" />}>
            <HeatmapPanel />
          </Suspense>
        }
        weight={
          <Suspense fallback={<Skeleton className="h-[40rem] w-full" />}>
            <WeightPanel />
          </Suspense>
        }
      />
      <nav aria-label="Physique tools">
        <Link
          href="/body/progress"
          className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Progress photos and measurements
        </Link>
      </nav>
    </main>
  );
}
