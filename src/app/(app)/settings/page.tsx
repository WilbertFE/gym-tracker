import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { buildMetadata } from "@/lib/metadata";
import { AccountLinks } from "./components/account-links";
import { ProfilePanel } from "./components/profile-panel";
import { SettingsPanel } from "./components/settings-panel";

export const metadata: Metadata = buildMetadata({
  title: "Settings",
  description: "Choose your country, weight unit (kg or lb) and currency, set how the game looks and sounds, and set up your player profile.",
  path: "/settings",
  keywords: ["gym tracker settings", "kg or lb", "currency"],
});

export default function SettingsPage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader label="Account" title="Settings" description="Your display, game and account preferences." />

      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <SettingsPanel />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ProfilePanel />
      </Suspense>

      <Suspense fallback={null}>
        <AccountLinks />
      </Suspense>
    </main>
  );
}
