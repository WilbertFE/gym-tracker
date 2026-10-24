import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Membership",
  description: "Track your gym membership dates, price and expiry reminders.",
  path: "/membership",
  keywords: ["gym tracker", "membership"],
});

export default function MembershipPage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader label="Account" title="Membership" description="Track your gym membership dates, price and expiry reminders." />
      <Panel label="Status">
        <p className="text-sm text-muted-foreground">Planned for Phase 2.</p>
      </Panel>
    </main>
  );
}
