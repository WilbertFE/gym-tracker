import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { buildMetadata } from "@/lib/metadata";
import { ExerciseForm } from "./components/exercise-form";
import { ExerciseLibrary } from "./components/exercise-library";

export const metadata: Metadata = buildMetadata({
  title: "Exercise library",
  description: "Browse built-in exercises by muscle group and add your own.",
  path: "/workouts/exercises",
  keywords: ["exercise library", "muscle groups"],
});

export default function ExercisesPage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        label="Training"
        title="Exercise library"
        description="Every exercise maps to a primary muscle, which feeds the body heatmap later."
      />
      <Panel label="Add your own">
        <ExerciseForm />
      </Panel>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ExerciseLibrary />
      </Suspense>
    </main>
  );
}
