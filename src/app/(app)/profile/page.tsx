import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FeatureGate } from "@/components/feature-gate";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUserId } from "@/lib/auth";
import { buildMetadata } from "@/lib/metadata";
import { getProfile } from "@/lib/repositories/profiles";

export const metadata: Metadata = buildMetadata({
  title: "Profile",
  description: "Your player profile: who can see it and what it shows.",
  path: "/profile",
  keywords: ["profile", "player"],
});

export default function ProfileEntryPage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader label="You" title="Profile" description="Your player page, with the rank, stats and items you found." />
      <Suspense fallback={<Skeleton className="h-48 w-full" />}>
        <FeatureGate id="profile">
          <ProfileEntry />
        </FeatureGate>
      </Suspense>
    </main>
  );
}

/** Takes you to your own profile, or tells you how to make one. */
async function ProfileEntry() {
  const userId = await getCurrentUserId();
  const { available, profile } = await getProfile(userId);
  if (profile) redirect(`/u/${profile.username}`);

  return (
    <Panel label="No profile yet" variant="system">
      <p className="text-sm text-muted-foreground">
        {available
          ? "A profile shows your rank, stats and the items you found. It starts private, and you choose who can see it and which parts."
          : "Profiles are not set up yet. They appear here as soon as the database is updated."}
      </p>
      {available && (
        <Link
          href="/settings#profile"
          className="font-display mt-4 inline-flex h-11 items-center bg-primary px-5 text-sm font-semibold tracking-wide text-primary-foreground"
        >
          Make my profile
        </Link>
      )}
    </Panel>
  );
}
