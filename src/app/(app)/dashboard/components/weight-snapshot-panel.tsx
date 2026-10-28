import Link from "next/link";
import { Panel } from "@/components/panel";
import { Stat } from "@/components/stat";
import { getCurrentUserId } from "@/lib/auth";
import { getSettings } from "@/lib/repositories/settings";
import { listWeights } from "@/lib/repositories/weights";
import { displayChange, displayWeight } from "@/lib/units";
import { summarizeWeights } from "@/lib/weight";

/** Small on purpose: latest weight and the 7 day change. The chart and history live on the Body page. */
export async function WeightSnapshotPanel() {
  const userId = await getCurrentUserId();
  const [logs, settings] = await Promise.all([listWeights(userId), getSettings(userId)]);
  const unit = settings.weight_unit;
  const summary = summarizeWeights(logs);

  return (
    <Panel label="Body weight">
      <div className="flex flex-col gap-3">
        <Stat
          label="Latest"
          value={summary.latest ? displayWeight(summary.latest.weight_kg, unit) : "n/a"}
          unit={summary.latest ? unit : undefined}
          hint={summary.change7d === null ? "Log a weight to see changes" : `${displayChange(summary.change7d, unit)} ${unit} in 7 days`}
        />
        <Link
          href="/body"
          className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Log weight and see the trend
        </Link>
      </div>
    </Panel>
  );
}
