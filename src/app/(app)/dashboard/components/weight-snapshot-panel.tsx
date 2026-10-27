import Link from "next/link";
import { Panel } from "@/components/panel";
import { Stat } from "@/components/stat";
import { getCurrentUserId } from "@/lib/auth";
import { listWeights } from "@/lib/repositories/weights";
import { summarizeWeights } from "@/lib/weight";

const signed = (n: number | null) =>
  n === null ? "n/a" : `${n > 0 ? "+" : ""}${n.toFixed(1)}`;

/** Small on purpose: latest weight and the 7 day change. The chart and history live on the Body page. */
export async function WeightSnapshotPanel() {
  const userId = await getCurrentUserId();
  const summary = summarizeWeights(await listWeights(userId));

  return (
    <Panel label="Body weight">
      <div className="flex flex-col gap-3">
        <Stat
          label="Latest"
          value={summary.latest ? summary.latest.weight_kg.toFixed(1) : "n/a"}
          unit={summary.latest ? "kg" : undefined}
          hint={summary.change7d === null ? "Log a weight to see changes" : `${signed(summary.change7d)} kg in 7 days`}
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
