import { format, parseISO } from "date-fns";
import Link from "next/link";
import { ElapsedTimer } from "@/components/elapsed-timer";
import { Panel } from "@/components/panel";
import { getCurrentUserId } from "@/lib/auth";
import { listExercises } from "@/lib/repositories/exercises";
import { getSettings } from "@/lib/repositories/settings";
import { listAllSets, listSessions } from "@/lib/repositories/workouts";
import { displayVolume } from "@/lib/units";
import { formatDuration, sessionVolume } from "@/lib/workout";
import { GATE_MESSAGES, getWorkoutGate } from "@/lib/workout-gate";
import { StartWorkoutButton } from "@/components/start-workout-button";

export async function WorkoutsOverview() {
  const userId = await getCurrentUserId();
  const [sessions, sets, exercises, settings] = await Promise.all([
    listSessions(userId),
    listAllSets(userId),
    listExercises(userId),
    getSettings(userId),
  ]);
  const unit = settings.weight_unit;

  const gate = await getWorkoutGate(userId);
  const active = sessions.find((s) => s.ended_at === null) ?? null;
  const finished = sessions.filter((s) => s.ended_at !== null);

  return (
    <div className="flex flex-col gap-6">
      {active ? (
        <Panel label="In progress">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Elapsed
              </span>
              <ElapsedTimer since={active.started_at} className="tabular text-5xl font-medium leading-none" />
            </div>
            <Link
              href={`/workouts/${active.id}`}
              className="inline-flex h-12 items-center justify-center bg-primary px-8 text-base font-medium text-primary-foreground"
            >
              Resume workout
            </Link>
          </div>
        </Panel>
      ) : (
        <Panel label="Start">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              No workout in progress. Duration is tracked automatically.
            </p>
            <StartWorkoutButton blockedMessage={gate.reason ? GATE_MESSAGES[gate.reason] : undefined} />
          </div>
        </Panel>
      )}

      <Panel label="History">
        {finished.length === 0 ? (
          <p className="text-sm text-muted-foreground">No finished workouts yet.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {finished.map((session) => {
              const own = sets.filter((s) => s.session_id === session.id);
              const exerciseIds = new Set(own.map((s) => s.exercise_id));
              const names = [...exerciseIds]
                .map((id) => exercises.find((e) => e.id === id)?.name)
                .filter(Boolean)
                .slice(0, 3)
                .join(", ");
              return (
                <li key={session.id}>
                  <Link
                    href={`/workouts/${session.id}`}
                    className="flex min-h-14 flex-col gap-1 py-3 hover:bg-surface-raised sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="flex flex-col gap-1">
                      <span className="tabular text-sm">
                        {format(parseISO(session.date), "EEE d MMM yyyy")}
                      </span>
                      <span className="text-xs text-muted-foreground">{names || "No sets logged"}</span>
                    </span>
                    <span className="tabular flex gap-4 text-xs text-muted-foreground">
                      <span>{session.duration_minutes !== null ? formatDuration(session.duration_minutes) : "n/a"}</span>
                      <span>{own.length} sets</span>
                      <span>{displayVolume(sessionVolume(own), unit)} {unit}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
