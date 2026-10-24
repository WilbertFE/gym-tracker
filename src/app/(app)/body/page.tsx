import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { buildMetadata } from "@/lib/metadata";
import { WeightPanel } from "./components/weight-panel";

export const metadata: Metadata = buildMetadata({
  title: "Body",
  description: "Track body weight over time. Muscle heatmap and progress photos are coming.",
  path: "/body",
  keywords: ["gym tracker", "body weight", "weight trend"],
});

export default function BodyPage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        label="Body"
        title="Body"
        description="Weight trend today. Muscle heatmap and progress photos come in later phases."
      />
      <Suspense fallback={<Skeleton className="h-[40rem] w-full" />}>
        <WeightPanel />
      </Suspense>
      <Panel label="Muscle heatmap">
        <p className="text-sm text-muted-foreground">Planned for Phase 5.</p>
      </Panel>
    </main>
  );
}
