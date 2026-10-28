import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { buildMetadata } from "@/lib/metadata";
import { StatusView } from "./components/status-view";

export const metadata: Metadata = buildMetadata({
  title: "Status",
  description: "Your rank, level and five stats: strength, endurance, vitality, agility and discipline.",
  path: "/status",
  keywords: ["status", "stats", "rank"],
});

export default function StatusPage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        label="You"
        title="Status"
        description="Your rank and five stats. They grow by themselves as you train, there is nothing to spend."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <StatusView />
      </Suspense>
    </main>
  );
}
