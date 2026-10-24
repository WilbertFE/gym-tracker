import Link from "next/link";
import { Panel } from "@/components/panel";
import { Stat } from "@/components/stat";
import { WeightChart } from "@/components/weight-chart";
import { getCurrentUserId } from "@/lib/auth";
import { listWeights } from "@/lib/repositories/weights";
import { summarizeWeights } from "@/lib/weight";

const CHART_POINTS = 12;

const signed = (n: number | null) =>
  n === null ? "n/a" : `${n > 0 ? "+" : ""}${n.toFixed(1)}`;

export async function WeightSnapshotPanel() {
  const userId = await getCurrentUserId();
  const logs = await listWeights(userId);
  const summary = summarizeWeights(logs);
  const recent = logs.slice(0, CHART_POINTS).reverse();

  return (
    <Panel label="Weight trend">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Stat
            label="Latest"
            value={summary.latest ? summary.latest.weight_kg.toFixed(1) : "n/a"}
            unit={summary.latest ? "kg" : undefined}
          />
          <Stat
            label="7 days"
            value={signed(summary.change7d)}
            unit={summary.change7d === null ? undefined : "kg"}
          />
        </div>

        {recent.length > 1 ? (
          <WeightChart data={recent.map(({ date, weight_kg }) => ({ date, weight_kg }))} />
        ) : (
          <p className="text-sm text-muted-foreground">Log at least two weights to see the trend.</p>
        )}

        <Link
          href="/body"
          className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Log weight and see history
        </Link>
      </div>
    </Panel>
  );
}
