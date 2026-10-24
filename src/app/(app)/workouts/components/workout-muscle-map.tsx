import { BodySvg } from "@/components/body-map/body-svg";
import { Panel } from "@/components/panel";
import { weeklyCoverage, workedMuscles } from "@/lib/coverage";
import { buildMuscleStats, type IntensityLevel } from "@/lib/muscle-intensity";
import { MUSCLE_LABELS, type MuscleGroup } from "@/lib/muscles";
import { listAllSets, listSessions } from "@/lib/repositories/workouts";
import type { Exercise, WorkoutSession, WorkoutSet } from "@/lib/types";

type WorkoutMuscleMapProps = {
  userId: string;
  session: WorkoutSession;
  /** Sets logged in this workout. */
  sets: WorkoutSet[];
  exercises: Exercise[];
  active: boolean;
};

const names = (muscles: MuscleGroup[]) => muscles.map((m) => MUSCLE_LABELS[m]).join(", ") || "none";

/**
 * Just the body: front and back, colored by the week's total (this workout
 * included), with the muscles this workout has worked outlined. It updates
 * after every logged set because the set logger refreshes the page.
 */
export async function WorkoutMuscleMap({ userId, session, sets, exercises, active }: WorkoutMuscleMapProps) {
  const [allSessions, allSets] = await Promise.all([listSessions(userId), listAllSets(userId)]);

  // The workout's own week, whether it is happening now or was a while ago.
  const week = buildMuscleStats({ sessions: allSessions, sets: allSets, exercises, today: session.date });
  const mine = buildMuscleStats({ sessions: [session], sets, exercises, today: session.date });

  const worked = workedMuscles(mine).map((w) => w.muscle);
  const untouched = weeklyCoverage(week).untrained.map((u) => u.muscle);
  const highlight = new Set<MuscleGroup>(worked);

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
      <figure className="flex items-start justify-center gap-8" aria-label="Muscle map, front and back">
        {(["front", "back"] as const).map((view) => (
          <div key={view} className="flex flex-col items-center gap-1">
            <BodySvg view={view} levels={levels} scores={scores} highlight={highlight} className="h-64" />
            <figcaption className="tabular text-[10px] uppercase tracking-widest text-muted-foreground">
              {view}
            </figcaption>
          </div>
        ))}
      </figure>
      <p className="sr-only">
        Outlined muscles were worked in this workout: {names(worked)}. Not trained yet this week: {names(untouched)}.
      </p>
    </Panel>
  );
}
