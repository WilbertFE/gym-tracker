import { BodySvg } from "@/components/body-map/body-svg";
import { Panel } from "@/components/panel";
import { MUSCLE_LABELS, type MuscleGroup } from "@/lib/muscles";
import { listAllSets, listSessions } from "@/lib/repositories/workouts";
import { workoutBody } from "@/lib/workout-body";
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

  const { levels, scores, worked, untouched } = workoutBody({
    allSessions,
    allSets,
    session,
    sets,
    exercises,
  });
  const highlight = new Set<MuscleGroup>(worked);

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
