import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { buildMetadata } from "@/lib/metadata";
import { ProfilePanel } from "./components/profile-panel";
import { SettingsPanel } from "./components/settings-panel";

export const metadata: Metadata = buildMetadata({
  title: "Settings",
  description: "Choose your country, weight unit (kg or lb) and currency, and set up your player profile.",
  path: "/settings",
  keywords: ["gym tracker settings", "kg or lb", "currency"],
});

export default function SettingsPage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader label="Account" title="Settings" description="How the app shows weights and prices." />

      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <SettingsPanel />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ProfilePanel />
      </Suspense>

      <nav aria-label="Account pages">
        <Link
          href="/membership"
          className="flex min-h-12 items-center justify-between border border-primary/25 bg-card px-4 text-sm hover:border-primary/60 hover:bg-surface-raised"
        >
          Gym membership
          <span aria-hidden className="text-muted-foreground">&rarr;</span>
        </Link>
      </nav>
    </main>
  );
}
