import Link from "next/link";
import { ElapsedTimer } from "@/components/elapsed-timer";
import { Panel } from "@/components/panel";
import { StartWorkoutButton } from "@/components/start-workout-button";
import { getCurrentUserId } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { MUSCLE_LABELS } from "@/lib/muscles";
import { listExercises } from "@/lib/repositories/exercises";
import { listAllSets, listSessions } from "@/lib/repositories/workouts";
import { FOCUS_LABELS, suggestNextWorkout } from "@/lib/suggestion";
import { GATE_MESSAGES, getWorkoutGate } from "@/lib/workout-gate";

export async function NextWorkoutPanel() {
  const userId = await getCurrentUserId();
  const [sessions, sets, exercises] = await Promise.all([
    listSessions(userId),
    listAllSets(userId),
    listExercises(userId),
  ]);

  const gate = await getWorkoutGate(userId);
  const active = sessions.find((s) => s.ended_at === null);
  if (active) {
    return (
      <Panel label="Workout in progress" tour="train">
        <div className="flex flex-col gap-4">
          <ElapsedTimer since={active.started_at} className="tabular text-5xl font-medium leading-none" />
          <Link
            href={`/workouts/${active.id}`}
            className="inline-flex h-12 items-center justify-center bg-primary px-8 text-base font-medium text-primary-foreground"
          >
            Resume workout
          </Link>
        </div>
      </Panel>
    );
  }

  const suggestion = suggestNextWorkout({ sessions, sets, exercises, today: todayISO() });

  return (
    <Panel label="2. Start training" tour="train">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-3xl font-semibold">{FOCUS_LABELS[suggestion.focus]}</p>
          <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
        </div>

        <ul className="flex flex-col divide-y border">
          {suggestion.exercises.map((e) => (
            <li key={e.id} className="flex min-h-11 items-center justify-between gap-3 px-3 text-sm">
              <span>{e.name}</span>
              <span className="tabular text-[10px] uppercase tracking-widest text-muted-foreground">
                {MUSCLE_LABELS[e.primary_muscle]}
              </span>
            </li>
          ))}
        </ul>

        <StartWorkoutButton blockedMessage={gate.reason ? GATE_MESSAGES[gate.reason] : undefined} />
      </div>
    </Panel>
  );
}
