import { Panel } from "@/components/panel";
import { getCurrentUserId } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { buildMuscleStats } from "@/lib/muscle-intensity";
import { MUSCLE_LABELS } from "@/lib/muscles";
import { recommendUndertrained } from "@/lib/recommendations";
import { listExercises } from "@/lib/repositories/exercises";
import { listAllSets, listSessions } from "@/lib/repositories/workouts";

export async function RecommendationsPanel() {
  const userId = await getCurrentUserId();
  const [sessions, sets, exercises] = await Promise.all([
    listSessions(userId),
    listAllSets(userId),
    listExercises(userId),
  ]);

  const stats = buildMuscleStats({ sessions, sets, exercises, today: todayISO() });
  const recommendations = recommendUndertrained(stats);

  return (
    <Panel label="Under-trained this week">
      {recommendations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Every muscle group has had a moderate amount of work this week. Nothing to add.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {recommendations.map((rec) => (
            <li key={rec.muscle} className="flex flex-col gap-3 border p-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold">{MUSCLE_LABELS[rec.muscle]}</h3>
                <p className="text-sm text-muted-foreground">{rec.reason}</p>
                <p className="tabular text-xs text-muted-foreground">
                  About {rec.setsToModerate} more {rec.setsToModerate === 1 ? "set" : "sets"} to reach a moderate level
                </p>
              </div>
              <div>
                <h4 className="mb-1 text-[11px] uppercase tracking-widest text-muted-foreground">Try</h4>
                <ul className="flex flex-col text-sm">
                  {rec.exercises.map((name) => (
                    <li key={name} className="min-h-8 border-t py-1.5">
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
