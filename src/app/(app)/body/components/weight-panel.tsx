import { Panel } from "@/components/panel";
import { Stat } from "@/components/stat";
import { getCurrentUserId } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { listLogPhotos } from "@/lib/repositories/logPhotos";
import { getSettings } from "@/lib/repositories/settings";
import { listWeights } from "@/lib/repositories/weights";
import { displayChange, displayWeight } from "@/lib/units";
import type { LogPhoto } from "@/lib/types";
import { summarizeWeights } from "@/lib/weight";
import { WeightChart } from "@/components/weight-chart";
import { WeightForm } from "./weight-form";
import { WeightHistory } from "./weight-history";

export async function WeightPanel() {
  const userId = await getCurrentUserId();
  const [logs, logPhotos, settings] = await Promise.all([
    listWeights(userId),
    listLogPhotos(userId, { kind: "weight" }),
    getSettings(userId),
  ]);
  const unit = settings.weight_unit;
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
            value={summary.latest ? displayWeight(summary.latest.weight_kg, unit) : "n/a"}
            unit={summary.latest ? unit : undefined}
          />
          <Stat
            label="7 days"
            value={summary.change7d === null ? "n/a" : displayChange(summary.change7d, unit)}
            unit={summary.change7d === null ? undefined : unit}
          />
          <Stat
            label="All time"
            value={summary.changeTotal === null ? "n/a" : displayChange(summary.changeTotal, unit)}
            unit={summary.changeTotal === null ? undefined : unit}
          />
        </div>

        {ascending.length > 1 ? (
          <WeightChart unit={unit} data={ascending.map(({ date, weight_kg }) => ({ date, weight_kg }))} />
        ) : (
          <p className="text-sm text-muted-foreground">Log at least two entries to see the trend.</p>
        )}

        <WeightForm today={todayISO()} unit={unit} />
        <WeightHistory unit={unit} logs={logs} photosByWeight={photosByWeight} />
      </div>
    </Panel>
  );
}
