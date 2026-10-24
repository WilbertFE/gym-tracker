import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { buildMetadata } from "@/lib/metadata";
import { CheckinPanel } from "./components/checkin-panel";
import { MembershipSnapshotPanel } from "./components/membership-snapshot-panel";
import { MuscleMapPanel } from "./components/muscle-map-panel";
import { NextWorkoutPanel } from "./components/next-workout-panel";
import { WeekPanel } from "./components/week-panel";
import { WeightSnapshotPanel } from "./components/weight-snapshot-panel";

export const metadata: Metadata = buildMetadata({
  title: "Dashboard",
  description: "Weekly summary, muscle map, streak, weight trend, membership status and your next workout.",
  path: "/dashboard",
  keywords: ["gym tracker", "dashboard", "weekly summary", "check-in streak"],
});

export default function DashboardPage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        label="Overview"
        title="Dashboard"
        description="Your week at a glance, and what to train next."
      />

      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <WeekPanel />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-80 w-full" />}>
        <MuscleMapPanel />
      </Suspense>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <NextWorkoutPanel />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <MembershipSnapshotPanel />
        </Suspense>
      </div>

      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <CheckinPanel />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <WeightSnapshotPanel />
      </Suspense>
    </main>
  );
}
