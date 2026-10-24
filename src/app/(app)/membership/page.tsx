import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { buildMetadata } from "@/lib/metadata";
import { MembershipPanel } from "./components/membership-panel";

export const metadata: Metadata = buildMetadata({
  title: "Membership",
  description: "Track your gym membership dates, price and expiry reminders.",
  path: "/membership",
  keywords: ["gym membership", "membership expiry"],
});

export default function MembershipPage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        label="Account"
        title="Membership"
        description="Know when your gym membership ends before it does."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <MembershipPanel />
      </Suspense>
    </main>
  );
}
