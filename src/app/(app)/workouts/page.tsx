import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { buildMetadata } from "@/lib/metadata";
import { WorkoutsOverview } from "./components/workouts-overview";

export const metadata: Metadata = buildMetadata({
  title: "Workouts",
  description: "Start a workout, log sets and reps fast, and review your training history.",
  path: "/workouts",
  keywords: ["gym tracker", "workout log", "sets and reps"],
});

export default function WorkoutsPage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        label="Training"
        title="Workouts"
        description="Log sets between exercises. Duration is measured for you."
      />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <WorkoutsOverview />
      </Suspense>
      <nav aria-label="Workout tools" data-tour="library">
        <Link
          href="/workouts/exercises"
          className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Exercise library
        </Link>
      </nav>
    </main>
  );
}
