import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { buildMetadata } from "@/lib/metadata";
import { BossView } from "./components/boss-view";

export const metadata: Metadata = buildMetadata({
  title: "The friends boss",
  description: "Fight one boss together with your friends every week: everyone's damage counts toward one health bar.",
  path: "/friends/boss",
  keywords: ["friends boss", "weekly boss", "workout game"],
});

export default function FriendsBossPage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader label="Compete" title="The friends boss" description="One boss a week, fought together. Every set you log hurts it." />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <BossView />
      </Suspense>
    </main>
  );
}
