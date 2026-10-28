import Link from "next/link";
import { Panel } from "@/components/panel";
import { getCurrentUserId } from "@/lib/auth";
import { loadLevel } from "@/lib/level";

/** Small on purpose: the level, a progress bar and a link. The breakdown lives on its own page. */
export async function LevelPanel() {
  const userId = await getCurrentUserId();
  const { level } = await loadLevel(userId);
  const percent = Math.round(level.progress * 100);

  return (
    <Panel label="Level">
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-4">
          <p className="tabular text-4xl font-medium leading-none">
            {level.level}
            <span className="ml-2 text-sm text-muted-foreground">{level.title}</span>
          </p>
          <p className="tabular text-xs text-muted-foreground">{level.total.toLocaleString("en-US")} XP</p>
        </div>

        <div
          role="progressbar"
          aria-label={`Progress to level ${level.level + 1}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-1.5 w-full bg-intensity-none"
        >
          <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
        </div>
        <p className="tabular text-xs text-muted-foreground">
          {level.toNext} XP to level {level.level + 1}
        </p>

        <Link
          href="/dashboard/level"
          className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          How XP works
        </Link>
      </div>
    </Panel>
  );
}
