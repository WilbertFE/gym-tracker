import { Panel } from "@/components/panel";
import { RankBadge } from "@/components/rank-badge";
import { getCurrentUserId } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { isUnlocked } from "@/lib/unlocks";
import { getShowAll } from "@/lib/unlock-state";
import { loadLevel } from "@/lib/level";
import { RANKS } from "@/lib/ranks";
import { cn } from "@/lib/utils";
import { XP_SOURCE_HINTS, xpForLevel } from "@/lib/xp";
import { BoostersPanel } from "./boosters-panel";

export async function LevelDetail() {
  const userId = await getCurrentUserId();
  const [{ xp, level, boosts }, showAll] = await Promise.all([loadLevel(userId), getShowAll()]);
  const percent = Math.round(level.progress * 100);

  return (
    <div className="flex flex-col gap-6">
      <Panel label="Your level">
        <div className="flex items-center gap-5">
          <RankBadge rank={level.rank} size={112} />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div>
              <p className="tabular text-[11px] uppercase tracking-widest text-muted-foreground">{level.rank.name}</p>
              <p className="tabular text-5xl font-semibold leading-none">
                <span className="mr-2 text-lg font-normal text-muted-foreground">Level</span>
                {level.level}
              </p>
            </div>
            <div
              role="progressbar"
              aria-label={`Progress to level ${level.level + 1}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              className="h-2.5 w-full bg-intensity-none"
            >
              <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
            </div>
            <p className="tabular text-xs text-muted-foreground">
              {level.intoLevel} / {level.levelSpan} XP in this level, {level.toNext} to go.{" "}
              {level.total.toLocaleString("en-US")} XP in total.
            </p>
          </div>
        </div>
      </Panel>

      {isUnlocked("boosters", level.level, showAll) && <BoostersPanel boosts={boosts} today={todayISO()} />}

      <Panel label="Rank ladder">
        <ol className="flex flex-col divide-y border">
          {RANKS.map((rank) => {
            const earned = level.level >= rank.minLevel;
            const current = level.rank.id === rank.id;
            const needed = xpForLevel(rank.minLevel);
            const away = needed - level.total;
            return (
              <li
                key={rank.id}
                aria-current={current ? "step" : undefined}
                className={cn("flex items-center gap-4 p-3", current && "bg-surface-raised")}
              >
                <RankBadge rank={rank} size={64} locked={!earned} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className={cn("text-sm font-medium", !earned && "text-muted-foreground")}>
                    {rank.name}
                    {current && (
                      <span className="tabular ml-2 border border-primary px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-primary">
                        You
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{rank.tagline}</p>
                </div>
                <div className="tabular shrink-0 text-right text-xs">
                  <p className={earned ? "text-foreground" : "text-muted-foreground"}>Level {rank.minLevel}</p>
                  <p className="text-muted-foreground">
                    {earned ? "Earned" : `${away.toLocaleString("en-US")} XP away`}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">
          Each level costs a little more XP than the one before: level 2 at 13 XP, level 10 at 153, level 50 at 1,813 and
          level 100 at 6,138.
        </p>
      </Panel>

      <Panel label="Where your XP comes from">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-widest text-muted-foreground">
              <th scope="col" className="pb-2 font-normal">Source</th>
              <th scope="col" className="pb-2 text-right font-normal">Count</th>
              <th scope="col" className="pb-2 text-right font-normal">XP</th>
            </tr>
          </thead>
          <tbody>
            {xp.lines.map((line) => (
              <tr key={line.source} className="border-t align-top">
                <th scope="row" className="py-3 pr-3 text-left font-normal">
                  {line.label}
                  <span className="mt-1 block text-xs text-muted-foreground">{XP_SOURCE_HINTS[line.source]}</span>
                </th>
                <td className="tabular py-3 text-right">{line.count}</td>
                <td className="tabular py-3 text-right">
                  {line.xp}
                  {line.bonus > 0 && (
                    <span className="block text-[10px] text-muted-foreground">{line.bonus} from boosts</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t">
              <th scope="row" className="py-3 text-left font-medium">Total</th>
              <td />
              <td className="tabular py-3 text-right font-medium">{xp.total}</td>
            </tr>
          </tfoot>
        </table>
      </Panel>
    </div>
  );
}
