import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { buildMetadata } from "@/lib/metadata";
import { LeaderboardView } from "./components/leaderboard-view";

export const metadata: Metadata = buildMetadata({
  title: "Leaderboard",
  description: "See who earns the most XP, worldwide and in your country, this week and of all time.",
  path: "/leaderboard",
  keywords: ["leaderboard", "xp ranking", "gym ranking"],
});

export default function LeaderboardPage({ searchParams }: PageProps<"/leaderboard">) {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        label="Compete"
        title="Leaderboard"
        description="Climb the board with XP from workouts, check-ins, quests and streaks."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Board searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Board({ searchParams }: Pick<PageProps<"/leaderboard">, "searchParams">) {
  const { scope, period } = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return <LeaderboardView scope={first(scope)} period={first(period)} />;
}
