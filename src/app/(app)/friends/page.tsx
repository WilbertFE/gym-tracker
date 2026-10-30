import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { buildMetadata } from "@/lib/metadata";
import { FriendsView } from "./components/friends-view";

export const metadata: Metadata = buildMetadata({
  title: "Friends",
  description: "Add friends with a friend code and fight a weekly boss together.",
  path: "/friends",
  keywords: ["friends", "friend code", "workout game"],
});

export default function FriendsPage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader label="Compete" title="Friends" description="Add friends with a code. Every week you fight one boss together." />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <FriendsView />
      </Suspense>
    </main>
  );
}
