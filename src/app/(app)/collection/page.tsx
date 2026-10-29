import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { buildMetadata } from "@/lib/metadata";
import { CollectionView } from "./components/collection-view";

export const metadata: Metadata = buildMetadata({
  title: "Collection",
  description: "Your quest chests and the items you found: badge frames, auras, nameplates and share looks.",
  path: "/collection",
  keywords: ["collection", "chests", "items"],
});

export default function CollectionPage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        label="You"
        title="Collection"
        description="Chests from your quests, and the items you found in them. Items only change how things look."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <CollectionView />
      </Suspense>
    </main>
  );
}
