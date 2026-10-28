import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUserId } from "@/lib/auth";
import { loadLevel } from "@/lib/level";
import { isUnlocked } from "@/lib/unlocks";
import { getShowAll } from "@/lib/unlock-state";
import { CheckinPanel } from "./checkin-panel";
import { GettingStarted } from "./getting-started";
import { LevelHero } from "./level-hero";
import { MembershipSnapshotPanel } from "./membership-snapshot-panel";
import { NextWorkoutPanel } from "./next-workout-panel";
import { QuestsPanel } from "./quests-panel";
import { UnlockTeaser } from "./unlock-teaser";
import { WeekPanel } from "./week-panel";
import { WeightSnapshotPanel } from "./weight-snapshot-panel";
import { WelcomeSlides } from "./welcome-slides";

/**
 * Level first, then today: check in, then train. The app shows itself in steps: a new account sees the
 * level card, the first steps and the two cards for today, and quests, the weekly summary and the rest
 * open as the level grows. The next unlock is always shown, so there is something to aim for.
 */
export async function DashboardContent() {
  const userId = await getCurrentUserId();
  const [{ level, xp, guide }, showAll] = await Promise.all([loadLevel(userId), getShowAll()]);
  const open = (id: Parameters<typeof isUnlocked>[0]) => isUnlocked(id, level.level, showAll);
  const firstRun = xp.workouts === 0 && level.level < 5 && !showAll;

  return (
    <>
      <WelcomeSlides show={firstRun} />

      <Suspense fallback={<Skeleton className="h-48 w-full" />}>
        <LevelHero />
      </Suspense>

      <GettingStarted steps={guide} />

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

      {!showAll && <UnlockTeaser level={level.level} totalXp={level.total} />}

      {open("quests") && (
        <Suspense fallback={<Skeleton className="h-72 w-full" />}>
          <QuestsPanel />
        </Suspense>
      )}

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
