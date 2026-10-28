import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { buildMetadata } from "@/lib/metadata";
import { LevelDetail } from "./components/level-detail";

export const metadata: Metadata = buildMetadata({
  title: "Level and XP",
  description: "Your level, your XP and what earns it.",
  path: "/dashboard/level",
  keywords: ["level", "xp", "gym streak"],
});

export default function LevelPage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        label="Dashboard"
        title="Level and XP"
        description="You earn XP for showing up and logging. Everything is worked out from your own entries."
      />

      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <LevelDetail />
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
