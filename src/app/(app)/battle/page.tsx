import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { buildMetadata } from "@/lib/metadata";
import { BattleView } from "./components/battle-view";

export const metadata: Metadata = buildMetadata({
  title: "Battle",
  description: "Every fight in one place: this week's gate, the season boss and the boss you fight with friends.",
  path: "/battle",
  keywords: ["boss fight", "weekly gate", "season boss", "workout game"],
});

export default function BattlePage({ searchParams }: PageProps<"/battle">) {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader label="Progress" title="Battle" description="Every set you log is a hit. This week's gate, the season boss and the boss you fight with friends." />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Tabbed searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Tabbed({ searchParams }: Pick<PageProps<"/battle">, "searchParams">) {
  const { tab } = await searchParams;
  return <BattleView tab={Array.isArray(tab) ? tab[0] : tab} />;
}
