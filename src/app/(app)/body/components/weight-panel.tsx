import { Panel } from "@/components/panel";
import { Stat } from "@/components/stat";
import { getCurrentUserId } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { listLogPhotos } from "@/lib/repositories/logPhotos";
import { listWeights } from "@/lib/repositories/weights";
import type { LogPhoto } from "@/lib/types";
import { summarizeWeights } from "@/lib/weight";
import { WeightChart } from "@/components/weight-chart";
import { WeightForm } from "./weight-form";
import { WeightHistory } from "./weight-history";

const signed = (n: number | null) =>
  n === null ? "n/a" : `${n > 0 ? "+" : ""}${n.toFixed(1)}`;

export async function WeightPanel() {
  const userId = await getCurrentUserId();
  const [logs, logPhotos] = await Promise.all([
    listWeights(userId),
    listLogPhotos(userId, { kind: "weight" }),
  ]);
  const photosByWeight: Record<string, LogPhoto[]> = {};
  for (const photo of logPhotos) {
    if (photo.weight_id) (photosByWeight[photo.weight_id] ??= []).push(photo);
  }
  const summary = summarizeWeights(logs);
  const ascending = [...logs].reverse();

  return (
    <Panel label="Body weight">
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-3 gap-4">
          <Stat
            label="Latest"
            value={summary.latest ? summary.latest.weight_kg.toFixed(1) : "n/a"}
            unit={summary.latest ? "kg" : undefined}
          />
          <Stat label="7 days" value={signed(summary.change7d)} unit={summary.change7d === null ? undefined : "kg"} />
          <Stat label="All time" value={signed(summary.changeTotal)} unit={summary.changeTotal === null ? undefined : "kg"} />
        </div>

        {ascending.length > 1 ? (
          <WeightChart data={ascending.map(({ date, weight_kg }) => ({ date, weight_kg }))} />
        ) : (
          <p className="text-sm text-muted-foreground">Log at least two entries to see the trend.</p>
        )}

        <WeightForm today={todayISO()} />
        <WeightHistory logs={logs} photosByWeight={photosByWeight} />
      </div>
    </Panel>
  );
}
