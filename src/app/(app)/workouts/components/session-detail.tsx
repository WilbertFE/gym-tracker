import { format, parseISO } from "date-fns";
import { notFound } from "next/navigation";
import { ElapsedTimer } from "@/components/elapsed-timer";
import { Panel } from "@/components/panel";
import { Stat } from "@/components/stat";
import { getCurrentUserId } from "@/lib/auth";
import { listExercises } from "@/lib/repositories/exercises";
import { getSessionWithSets, lastSetsByExercise } from "@/lib/repositories/workouts";
import { formatDuration, groupSetsByExercise, sessionVolume } from "@/lib/workout";
import { SessionActions } from "./session-actions";
import { SetList } from "./set-list";
import { SetLogger } from "./set-logger";

export async function SessionDetail({ id }: { id: string }) {
  const userId = await getCurrentUserId();
  const found = await getSessionWithSets(userId, id);
  if (!found) notFound();

  const { session, sets } = found;
  const active = session.ended_at === null;
  const [exercises, lastSets] = await Promise.all([
    listExercises(userId),
    lastSetsByExercise(userId, id),
  ]);

  const groups = groupSetsByExercise(sets, exercises);
  const volume = Math.round(sessionVolume(sets));

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
          <Stat label="Volume" value={volume.toLocaleString("en-US")} unit="kg" />
        </div>
      </Panel>

      {active && (
        <Panel label="Log a set">
          <SetLogger
            sessionId={id}
            exercises={exercises}
            lastSets={lastSets}
            sessionExerciseIds={groups.map((g) => g.exercise_id)}
          />
        </Panel>
      )}

      <Panel label="Logged sets">
        <SetList sessionId={id} groups={groups} editable={active} />
      </Panel>

      <SessionActions sessionId={id} active={active} />
    </div>
  );
}
