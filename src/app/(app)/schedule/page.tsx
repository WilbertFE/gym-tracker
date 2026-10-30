import type { Metadata } from "next";
import { Suspense } from "react";
import { FeatureGate } from "@/components/feature-gate";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { buildMetadata } from "@/lib/metadata";
import { AvailabilityPanel } from "./components/availability-panel";

export const metadata: Metadata = buildMetadata({
  title: "Schedule",
  description: "Keep your classes and other weekly commitments in one place.",
  path: "/schedule",
  keywords: ["gym schedule", "weekly commitments"],
});

export default function SchedulePage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        label="Planning"
        title="Schedule"
        description="Your classes and other plans, week by week."
      />

      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <FeatureGate id="schedule">
          <div className="flex flex-col gap-6">
            <AvailabilityPanel />
          </div>
        </FeatureGate>
      </Suspense>
    </main>
  );
}
