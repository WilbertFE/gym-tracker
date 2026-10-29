import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FeatureGate } from "@/components/feature-gate";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { buildMetadata } from "@/lib/metadata";
import { PhotosSection } from "./components/photos-section";

export const metadata: Metadata = buildMetadata({
  title: "Progress photos",
  description: "Upload private progress photos and compare them side by side.",
  path: "/body/progress",
  keywords: ["progress photos", "physique comparison"],
});

export default function ProgressPage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        label="Body"
        title="Progress photos"
        description="Compare photos from two dates and see how your weight changed between them."
      />

      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <FeatureGate id="body">
      <Suspense fallback={<Skeleton className="h-[40rem] w-full" />}>
        <PhotosSection />
      </Suspense>

      <nav aria-label="Related">
        <Link
          href="/body"
          className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Back to the muscle heatmap
        </Link>
      </nav>
        </FeatureGate>
      </Suspense>
    </main>
  );
}
