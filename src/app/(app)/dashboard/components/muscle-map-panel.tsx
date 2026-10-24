import Link from "next/link";
import { BodySvg } from "@/components/body-map/body-svg";
import { Panel } from "@/components/panel";
import { getCurrentUserId } from "@/lib/auth";
import { coverageDelta, coverageMessage, weeklyCoverage } from "@/lib/coverage";
import { todayISO } from "@/lib/dates";
import { buildMuscleStats, type IntensityLevel } from "@/lib/muscle-intensity";
import { MUSCLE_LABELS, type MuscleGroup } from "@/lib/muscles";
import { listExercises } from "@/lib/repositories/exercises";
import { listAllSets, listSessions } from "@/lib/repositories/workouts";
import { addDaysISO } from "@/lib/week";

const linkClass =
  "inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline";

/**
 * This week's muscle map: how many of the 16 groups got work, which have not
 * been touched yet, and how that compares with last week.
 */
export async function MuscleMapPanel() {
  const userId = await getCurrentUserId();
  const [sessions, sets, exercises] = await Promise.all([
    listSessions(userId),
    listAllSets(userId),
    listExercises(userId),
  ]);

  const today = todayISO();
  const stats = buildMuscleStats({ sessions, sets, exercises, today });
  // The same calculation one week earlier gives last week's full week to compare with.
  const previous = buildMuscleStats({ sessions, sets, exercises, today: addDaysISO(today, -7) });

  const coverage = weeklyCoverage(stats);
  const lastWeek = weeklyCoverage(previous);

  const levels = Object.fromEntries(stats.map((s) => [s.muscle, s.weekly.level])) as Record<
    MuscleGroup,
    IntensityLevel
  >;
  const scores = Object.fromEntries(stats.map((s) => [s.muscle, s.weekly.score])) as Record<
    MuscleGroup,
    number
  >;

  return (
    <Panel label="Muscle map, this week">
      <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
        <div className="flex flex-col gap-4">
          <div className="flex items-baseline gap-3">
            <p className="tabular text-5xl font-medium leading-none">
              {coverage.trained}
              <span className="text-2xl text-muted-foreground"> / {coverage.total}</span>
            </p>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              muscle groups trained
            </p>
          </div>

          <div
            role="progressbar"
            aria-label="Muscle groups trained this week"
            aria-valuemin={0}
            aria-valuemax={coverage.total}
            aria-valuenow={coverage.trained}
            className="h-1 w-full bg-intensity-none"
          >
            <div className="h-full bg-primary transition-[width] duration-200" style={{ width: `${coverage.percent}%` }} />
          </div>

          <p className="text-sm">
            {coverageMessage(coverage)}
            <span className="tabular ml-2 text-xs text-muted-foreground">
              {coverageDelta(coverage.trained, lastWeek.trained)}
            </span>
          </p>

          <section aria-labelledby="not-trained-heading">
            <h3
              id="not-trained-heading"
              className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground"
            >
              Not trained yet this week
            </h3>
            {coverage.untrained.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing left. Every group has had work.</p>
            ) : (
              <ul className="flex flex-wrap gap-1">
                {coverage.untrained.map(({ muscle, daysAgo }) => (
                  <li key={muscle} className="flex min-h-8 items-center gap-2 border bg-surface px-2 text-xs">
                    {MUSCLE_LABELS[muscle]}
                    <span className="tabular text-[10px] text-muted-foreground">
                      {daysAgo === null ? "never" : daysAgo === 0 ? "today" : `${daysAgo}d`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="flex flex-wrap gap-x-5">
            <Link href="/schedule" className={linkClass}>
              What to train next
            </Link>
            <Link href="/body" className={linkClass}>
              Full body map
            </Link>
          </div>
        </div>

        <figure className="flex items-start justify-center gap-4" aria-label="Muscle map, front and back">
          {(["front", "back"] as const).map((view) => (
            <div key={view} className="flex flex-col items-center gap-1">
              <BodySvg view={view} levels={levels} scores={scores} className="h-64" />
              <figcaption className="tabular text-[10px] uppercase tracking-widest text-muted-foreground">
                {view}
              </figcaption>
            </div>
          ))}
        </figure>
      </div>
    </Panel>
  );
}
