import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { buildMetadata } from "@/lib/metadata";
import { DashboardContent } from "./components/dashboard-content";

export const metadata: Metadata = buildMetadata({
  title: "Dashboard",
  description: "Check in, start your next workout and see your week, streak, weight and membership.",
  path: "/dashboard",
  keywords: ["gym tracker", "dashboard", "weekly summary", "check-in streak"],
});

export default function DashboardPage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader label="Overview" title="Dashboard" description="Check in, then train. Your week is below." />

      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <DashboardContent />
      </Suspense>
    </main>
  );
}
