import Link from "next/link";
import { BodySvg } from "@/components/body-map/body-svg";
import { Panel } from "@/components/panel";
import { coverageDelta, coverageMessage, weeklyCoverage, workedMuscles } from "@/lib/coverage";
import { buildMuscleStats, formatScore, type IntensityLevel } from "@/lib/muscle-intensity";
import { MUSCLE_LABELS, type MuscleGroup } from "@/lib/muscles";
import { listAllSets, listSessions } from "@/lib/repositories/workouts";
import type { Exercise, WorkoutSession, WorkoutSet } from "@/lib/types";
import { addDaysISO } from "@/lib/week";

type WorkoutMuscleMapProps = {
  userId: string;
  session: WorkoutSession;
  /** Sets logged in this workout. */
  sets: WorkoutSet[];
  exercises: Exercise[];
  active: boolean;
};

const chip = "flex min-h-8 items-center gap-2 border bg-surface px-2 text-xs";

/**
 * Live muscle map for one workout. Colors show the week's total (this workout
 * included), and the muscles this workout has worked are outlined, so you can
 * see what you have hit and what is still untouched while you train.
 */
export async function WorkoutMuscleMap({ userId, session, sets, exercises, active }: WorkoutMuscleMapProps) {
  const [allSessions, allSets] = await Promise.all([listSessions(userId), listAllSets(userId)]);

  // The workout's own week, whether it is happening now or was a while ago.
  const week = buildMuscleStats({ sessions: allSessions, sets: allSets, exercises, today: session.date });
  const lastWeek = buildMuscleStats({
    sessions: allSessions,
    sets: allSets,
    exercises,
    today: addDaysISO(session.date, -7),
  });
  const mine = buildMuscleStats({ sessions: [session], sets, exercises, today: session.date });

  const worked = workedMuscles(mine);
  const coverage = weeklyCoverage(week);
  const highlight = new Set<MuscleGroup>(worked.map((w) => w.muscle));

  const levels = Object.fromEntries(week.map((s) => [s.muscle, s.weekly.level])) as Record<
    MuscleGroup,
    IntensityLevel
  >;
  const scores = Object.fromEntries(week.map((s) => [s.muscle, s.weekly.score])) as Record<
    MuscleGroup,
    number
  >;

  return (
    <Panel label={active ? "Muscle map" : "Muscles trained"}>
      <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground">This workout</span>
              <span className="tabular text-4xl font-medium leading-none">
                {worked.length}
                <span className="ml-1 text-sm text-muted-foreground">groups</span>
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground">This week</span>
              <span className="tabular text-4xl font-medium leading-none">
                {coverage.trained}
                <span className="ml-1 text-sm text-muted-foreground">/ {coverage.total}</span>
              </span>
              <span className="tabular text-[11px] text-muted-foreground">
                {coverageDelta(coverage.trained, weeklyCoverage(lastWeek).trained)}
              </span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">{coverageMessage(coverage)}</p>

          <section aria-labelledby="worked-heading">
            <h3 id="worked-heading" className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">
              Worked in this workout
            </h3>
            {worked.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {active
                  ? "Log a set and the muscles you train light up here."
                  : "No sets were logged in this workout."}
              </p>
            ) : (
              <ul className="flex flex-wrap gap-1">
                {worked.map(({ muscle, sets: count }) => (
                  <li key={muscle} className={`${chip} border-primary`}>
                    {MUSCLE_LABELS[muscle]}
                    <span className="tabular text-[10px] text-muted-foreground">
                      {formatScore(count)} {count === 1 ? "set" : "sets"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {coverage.untrained.length > 0 && (
            <section aria-labelledby="untouched-heading">
              <h3
                id="untouched-heading"
                className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground"
              >
                Not trained yet this week
              </h3>
              <ul className="flex flex-wrap gap-1">
                {coverage.untrained.map(({ muscle, daysAgo }) => (
                  <li key={muscle}>
                    {active ? (
                      <Link
                        href={`/workouts/${session.id}?focus=${muscle}`}
                        prefetch={false}
                        className={`${chip} min-h-11 hover:bg-surface-raised`}
                        aria-label={`${MUSCLE_LABELS[muscle]}, not trained yet. Switch the logger to it.`}
                      >
                        {MUSCLE_LABELS[muscle]}
                        <span className="tabular text-[10px] text-muted-foreground">
                          {daysAgo === null ? "never" : daysAgo === 0 ? "today" : `${daysAgo}d`}
                        </span>
                      </Link>
                    ) : (
                      <span className={chip}>
                        {MUSCLE_LABELS[muscle]}
                        <span className="tabular text-[10px] text-muted-foreground">
                          {daysAgo === null ? "never" : daysAgo === 0 ? "today" : `${daysAgo}d`}
                        </span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {active && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Tap a group to switch the logger to an exercise for it.
                </p>
              )}
            </section>
          )}

          <p className="text-[11px] text-muted-foreground">
            Colors show this week&apos;s total. Outlined muscles were worked in this workout.
          </p>
        </div>

        <figure className="flex items-start justify-center gap-4" aria-label="Muscle map, front and back">
          {(["front", "back"] as const).map((view) => (
            <div key={view} className="flex flex-col items-center gap-1">
              <BodySvg view={view} levels={levels} scores={scores} highlight={highlight} className="h-56" />
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
