import { format, parseISO } from "date-fns";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ElapsedTimer } from "@/components/elapsed-timer";
import { Panel } from "@/components/panel";
import { RestTimer } from "@/components/rest-timer";
import { Stat } from "@/components/stat";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUserId } from "@/lib/auth";
import { listExercises } from "@/lib/repositories/exercises";
import { getSettings } from "@/lib/repositories/settings";
import { getSessionWithSets, lastSetsByExercise } from "@/lib/repositories/workouts";
import { displayVolume } from "@/lib/units";
import { MUSCLE_LABELS, type MuscleGroup } from "@/lib/muscles";
import { pickFocusExercise } from "@/lib/suggestion";
import { elapsedAtSets, formatDuration, groupSetsByExercise, lastSetCompletedAt, restBeforeSets, sessionVolume } from "@/lib/workout";
import { SessionActions } from "./session-actions";
import { SetList } from "./set-list";
import { SetLogger } from "./set-logger";
import { WorkoutShare } from "./workout-share";
import { WorkoutMuscleMap } from "./workout-muscle-map";

export async function SessionDetail({
  id,
  focus,
  shareOnLoad,
}: {
  id: string;
  focus: MuscleGroup | null;
  /** Open the share dialog straight away, after a workout was just finished. */
  shareOnLoad: boolean;
}) {
  const userId = await getCurrentUserId();
  const found = await getSessionWithSets(userId, id);
  if (!found) notFound();

  const { session, sets } = found;
  const active = session.ended_at === null;
  const [exercises, lastSets, settings] = await Promise.all([
    listExercises(userId),
    lastSetsByExercise(userId, id),
    getSettings(userId),
  ]);
  const unit = settings.weight_unit;

  const groups = groupSetsByExercise(sets, exercises);
  const focusExercise = focus ? pickFocusExercise(exercises, focus, Object.keys(lastSets)) : null;
  const volume = sessionVolume(sets);
  const rest = Object.fromEntries(restBeforeSets(sets));
  const at = Object.fromEntries(elapsedAtSets(sets, session.started_at));

  return (
    <div className="flex flex-col gap-6">
      <Panel label={format(parseISO(session.date), "EEEE d MMMM yyyy")}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {active ? (
            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Elapsed</span>
              <ElapsedTimer since={session.started_at} className="tabular text-4xl font-medium leading-none" />
            </div>
          ) : (
            <Stat
              label="Duration"
              value={session.duration_minutes !== null ? formatDuration(session.duration_minutes) : "n/a"}
            />
          )}
          <Stat label="Sets" value={sets.length} />
          <Stat label="Exercises" value={groups.length} />
          <Stat label="Volume" value={displayVolume(volume, unit)} unit={unit} hint="Weight x reps, all sets" />
        </div>
      </Panel>

      {active && (
        <Panel label="Log a set">
          {focus && focusExercise && (
            <p className="mb-4 border-l-2 border-primary pl-3 text-sm text-muted-foreground">
              Focus: {MUSCLE_LABELS[focus]}. {focusExercise.name} is ready below. Pick another exercise any time.
            </p>
          )}
          <div className="mb-4">
            <RestTimer since={lastSetCompletedAt(sets)} />
          </div>
          <SetLogger
            // Remount when the focus changes so the picked exercise is selected.
            key={focusExercise?.id ?? "none"}
            sessionId={id}
            exercises={exercises}
            lastSets={lastSets}
            unit={unit}
            sessionExerciseIds={groups.map((g) => g.exercise_id)}
            focusExerciseId={focusExercise?.id}
          />
        </Panel>
      )}

      <Suspense fallback={<Skeleton className="h-72 w-full" />}>
        <WorkoutMuscleMap userId={userId} session={session} sets={sets} exercises={exercises} active={active} />
      </Suspense>

      <Panel label="Logged sets">
        <p className="mb-4 text-xs text-muted-foreground">
          The time on the right is how far into the workout each set was done, then the rest before it.
        </p>
        <SetList sessionId={id} groups={groups} editable={active} unit={unit} rest={rest} at={at} />
      </Panel>

      {!active && sets.length > 0 && (
        <Suspense fallback={null}>
          <WorkoutShare
            userId={userId}
            session={session}
            sets={sets}
            exercises={exercises}
            unit={unit}
            shareOnLoad={shareOnLoad}
          />
        </Suspense>
      )}

      <SessionActions sessionId={id} active={active} hasSets={sets.length > 0} />
    </div>
  );
}
