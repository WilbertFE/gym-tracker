import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Workouts",
  description: "Log sessions, exercises, sets and reps, and review history.",
  path: "/workouts",
  keywords: ["gym tracker", "workouts"],
});

export default function WorkoutsPage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader label="Training" title="Workouts" description="Log sessions, exercises, sets and reps, and review history." />
      <Panel label="Status">
        <p className="text-sm text-muted-foreground">Planned for Phase 3.</p>
      </Panel>
    </main>
  );
}
