import { Panel } from "@/components/panel";
import { getCurrentUserId } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { buildMuscleStats } from "@/lib/muscle-intensity";
import { listExercises } from "@/lib/repositories/exercises";
import { listAllSets, listSessions } from "@/lib/repositories/workouts";
import { BodyHeatmap } from "./body-heatmap";

export async function HeatmapPanel() {
  const userId = await getCurrentUserId();
  const [sessions, sets, exercises] = await Promise.all([
    listSessions(userId),
    listAllSets(userId),
    listExercises(userId),
  ]);

  const stats = buildMuscleStats({ sessions, sets, exercises, today: todayISO() });

  return (
    <Panel label="Muscle heatmap" tour="heatmap">
      <BodyHeatmap stats={stats} />
    </Panel>
  );
}
