import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { buildMetadata } from "@/lib/metadata";
import { AvailabilityPanel } from "./components/availability-panel";
import { BestTimesPanel } from "./components/best-times-panel";

export const metadata: Metadata = buildMetadata({
  title: "Schedule",
  description: "Find the best time to train around your classes and other commitments.",
  path: "/schedule",
  keywords: ["gym schedule", "best time to train"],
});

export default function SchedulePage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        label="Planning"
        title="Schedule"
        description="Best times to train around your commitments."
      />

      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <BestTimesPanel />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <AvailabilityPanel />
      </Suspense>
    </main>
  );
}
