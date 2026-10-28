import Link from "next/link";
import { RankBadge } from "@/components/rank-badge";
import { getCurrentUserId } from "@/lib/auth";
import { loadLevel } from "@/lib/level";

/**
 * The first thing on the dashboard: your rank badge, level and progress. The point of the app is
 * to turn training into a game, so the score board comes before the to-do list.
 */
export async function LevelHero() {
  const userId = await getCurrentUserId();
  const { level } = await loadLevel(userId);
  const percent = Math.round(level.progress * 100);

  return (
    <section aria-label="Your level" className="border bg-card p-4 sm:p-6">
      <div className="flex items-center gap-4 sm:gap-6">
        <RankBadge rank={level.rank} size={104} className="sm:w-32" />

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div>
            <p className="tabular text-[11px] uppercase tracking-widest text-muted-foreground">{level.rank.name}</p>
            <h2 className="tabular text-4xl font-semibold leading-none sm:text-5xl">
              <span className="mr-2 text-base font-normal text-muted-foreground sm:text-lg">Level</span>
              {level.level}
            </h2>
          </div>

          <div className="flex flex-col gap-1">
            <div
              role="progressbar"
              aria-label={`Progress to level ${level.level + 1}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              className="h-2.5 w-full bg-intensity-none"
            >
              <div className="h-full bg-primary transition-[width] duration-700" style={{ width: `${percent}%` }} />
            </div>
            <p className="tabular flex justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {level.intoLevel} / {level.levelSpan} XP
              </span>
              <span>{level.toNext} XP to level {level.level + 1}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
        {level.nextRank ? (
          <p className="text-muted-foreground">
            Next rank: <span className="text-foreground">{level.nextRank.name}</span> at level {level.nextRank.minLevel},{" "}
            <span className="tabular">{level.xpToNextRank}</span> XP away
          </p>
        ) : (
          <p className="text-muted-foreground">You hold the highest rank.</p>
        )}
        <Link
          href="/dashboard/level"
          className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          See all ranks
        </Link>
      </div>
    </section>
  );
}
