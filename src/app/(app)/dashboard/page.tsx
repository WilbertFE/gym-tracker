import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { buildMetadata } from "@/lib/metadata";
import { CheckinPanel } from "./components/checkin-panel";

export const metadata: Metadata = buildMetadata({
  title: "Dashboard",
  description: "Weekly summary, streak, weight trend and membership status.",
  path: "/dashboard",
  keywords: ["gym tracker", "dashboard", "check-in streak"],
});

export default function DashboardPage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        label="Overview"
        title="Dashboard"
        description="Check in daily to keep your streak alive."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <CheckinPanel />
      </Suspense>
    </main>
  );
}
