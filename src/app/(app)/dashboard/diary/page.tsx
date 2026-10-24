import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { buildMetadata } from "@/lib/metadata";
import { DiaryPanel } from "./components/diary-panel";

export const metadata: Metadata = buildMetadata({
  title: "Gym diary",
  description: "Your check-in and weigh-in photos, day by day.",
  path: "/dashboard/diary",
  keywords: ["gym diary", "check-in photos"],
});

export default function DiaryPage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        label="Overview"
        title="Gym diary"
        description="Photos from your check-ins and weigh-ins, newest day first. Only you can see them."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <DiaryPanel />
      </Suspense>
      <nav aria-label="Related">
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Back to the dashboard
        </Link>
      </nav>
    </main>
  );
}
