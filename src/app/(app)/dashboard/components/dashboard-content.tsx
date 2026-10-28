import { Suspense } from "react";
import { Panel } from "@/components/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUserId } from "@/lib/auth";
import { listSessions } from "@/lib/repositories/workouts";
import { CheckinPanel } from "./checkin-panel";
import { LevelHero } from "./level-hero";
import { MembershipSnapshotPanel } from "./membership-snapshot-panel";
import { NextWorkoutPanel } from "./next-workout-panel";
import { QuestsPanel } from "./quests-panel";
import { WeekPanel } from "./week-panel";
import { WeightSnapshotPanel } from "./weight-snapshot-panel";

/**
 * Level first, then today: check in, then train. The summary panels only appear once there is a workout to
 * summarise, so a new account sees two cards and a short guide instead of a wall of empty charts.
 */
export async function DashboardContent() {
  const userId = await getCurrentUserId();
  const firstRun = (await listSessions(userId)).length === 0;

  return (
    <>
      <Suspense fallback={<Skeleton className="h-48 w-full" />}>
        <LevelHero />
      </Suspense>

      {firstRun && (
        <Panel label="Welcome">
          <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-muted-foreground">
            <li>Check in to say you went to the gym today.</li>
            <li>Start a workout and log your sets.</li>
            <li>Come back here to see your week.</li>
          </ol>
        </Panel>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Anchor target for the "Go to the check-in" links on the start workout buttons. */}
        <div id="daily-checkin" className="scroll-mt-6">
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <CheckinPanel />
          </Suspense>
        </div>
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <NextWorkoutPanel />
        </Suspense>
      </div>

      <Suspense fallback={<Skeleton className="h-72 w-full" />}>
        <QuestsPanel />
      </Suspense>

      {!firstRun && (
        <>
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <WeekPanel />
          </Suspense>

          <div className="grid items-start gap-6 lg:grid-cols-2">
            <Suspense fallback={<Skeleton className="h-40 w-full" />}>
              <WeightSnapshotPanel />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-40 w-full" />}>
              <MembershipSnapshotPanel />
            </Suspense>
          </div>
        </>
      )}
    </>
  );
}
