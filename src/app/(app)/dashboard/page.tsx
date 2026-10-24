import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Dashboard",
  description: "Weekly summary, streak, weight trend and membership status.",
  path: "/dashboard",
  keywords: ["gym tracker", "dashboard"],
});

export default function DashboardPage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader label="Overview" title="Dashboard" description="Weekly summary, streak, weight trend and membership status." />
      <Panel label="Status">
        <p className="text-sm text-muted-foreground">Planned for Phase 4.</p>
      </Panel>
    </main>
  );
}
