import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { FeatureGate } from "@/components/feature-gate";
import { Skeleton } from "@/components/ui/skeleton";
import { buildMetadata } from "@/lib/metadata";
import { validateUsername } from "@/lib/profile";
import { ProfileView } from "./components/profile-view";

/**
 * The metadata never looks the profile up: a title that named a private player, or a missing one, would tell
 * the world that the profile exists. It only repeats the address, and the page is never indexed.
 */
export async function generateMetadata({ params }: PageProps<"/u/[username]">): Promise<Metadata> {
  const { username } = await params;
  const checked = validateUsername(decodeURIComponent(username));
  const shown = checked.ok ? `@${checked.username}` : "Player";
  return buildMetadata({
    // The site name is added by the title template in the root layout.
    title: `${shown} profile`,
    description: "A player profile: rank, level, stats and the items they found.",
    path: `/u/${checked.ok ? checked.username : "player"}`,
    keywords: ["player profile"],
  });
}

/** Marks the page dynamic so it can read the request (see Cache Components docs). */
async function DynamicMarker() {
  await connection();
  return null;
}

export default function ProfilePage({ params }: PageProps<"/u/[username]">) {
  return (
    <main className="flex flex-col gap-6">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ProfileBody params={params} />
      </Suspense>
      <Suspense>
        <DynamicMarker />
      </Suspense>
    </main>
  );
}

async function ProfileBody({ params }: Pick<PageProps<"/u/[username]">, "params">) {
  const { username } = await params;
  return (
    <FeatureGate id="profile">
      <ProfileView username={decodeURIComponent(username)} />
    </FeatureGate>
  );
}
