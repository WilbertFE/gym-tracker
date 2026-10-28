import { format, parseISO } from "date-fns";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUserId } from "@/lib/auth";
import { buildMetadata } from "@/lib/metadata";
import { parseMuscle } from "@/lib/muscles";
import { getSessionWithSets } from "@/lib/repositories/workouts";
import { SessionDetail } from "../components/session-detail";

const NOT_FOUND: Metadata = {
  title: "Workout not found",
  description: "This workout does not exist.",
  robots: { index: false, follow: false },
};

export async function generateMetadata({ params }: PageProps<"/workouts/[id]">): Promise<Metadata> {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();
    const found = await getSessionWithSets(userId, id);
    if (!found) return NOT_FOUND;

    const day = format(parseISO(found.session.date), "d MMM yyyy");
    return buildMetadata({
      title: `Workout ${day}`,
      description: `Sets, reps and duration for your workout on ${day}.`,
      path: `/workouts/${id}`,
      keywords: ["workout session", "sets and reps"],
    });
  } catch (error) {
    // Redirects and framework control flow must keep propagating.
    if (error instanceof Error && "digest" in error) throw error;
    return NOT_FOUND;
  }
}

/** Marks the page dynamic so metadata can read the request (see Cache Components docs). */
async function DynamicMarker() {
  await connection();
  return null;
}

export default function WorkoutDetailPage({ params, searchParams }: PageProps<"/workouts/[id]">) {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader label="Training" title="Workout" description="Log sets as you go. Tap finish when you are done." />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <WorkoutBody params={params} searchParams={searchParams} />
      </Suspense>
      <Suspense>
        <DynamicMarker />
      </Suspense>
    </main>
  );
}

async function WorkoutBody({
  params,
  searchParams,
}: Pick<PageProps<"/workouts/[id]">, "params" | "searchParams">) {
  const { id } = await params;
  // `?focus=calves` opens the workout with an exercise for that muscle ready. Anything else is ignored.
  const { focus, share } = await searchParams;
  return (
    <SessionDetail
      id={id}
      focus={parseMuscle(Array.isArray(focus) ? focus[0] : focus)}
      shareOnLoad={(Array.isArray(share) ? share[0] : share) === "1"}
    />
  );
}
