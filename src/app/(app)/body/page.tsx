import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Body",
  description: "Muscle heatmap, progress photos and physique analysis.",
  path: "/body",
  keywords: ["gym tracker", "body"],
});

export default function BodyPage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader label="Body map" title="Body" description="Muscle heatmap, progress photos and physique analysis." />
      <Panel label="Status">
        <p className="text-sm text-muted-foreground">Planned for Phase 5.</p>
      </Panel>
    </main>
  );
}
