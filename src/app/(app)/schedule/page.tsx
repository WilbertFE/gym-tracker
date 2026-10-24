import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Schedule",
  description: "Weekly availability and the best time slots to train.",
  path: "/schedule",
  keywords: ["gym tracker", "schedule"],
});

export default function SchedulePage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader label="Planning" title="Schedule" description="Weekly availability and the best time slots to train." />
      <Panel label="Status">
        <p className="text-sm text-muted-foreground">Planned for Phase 7.</p>
      </Panel>
    </main>
  );
}
