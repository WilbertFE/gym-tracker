import { format, parseISO } from "date-fns";
import Link from "next/link";
import { MonsterArt } from "@/components/battle/monster-art";
import { ChestStrip } from "@/components/chest/chest-strip";
import { Panel } from "@/components/panel";
import { getCurrentUserId } from "@/lib/auth";
import { loadLevel } from "@/lib/level";
import { getQuickChests } from "@/lib/unlock-state";
import { cn } from "@/lib/utils";

/**
 * The season boss: one monster for the whole month, awakened and far tougher than a weekly gate. Every set you log all month
 * hurts it, and beating it before the month ends earns a Mythic chest, the rarest one in the game. Like a gate, it is worked
 * out from the sets, so there is nothing to claim and nothing stored.
 */
export async function SeasonPanel() {
  const userId = await getCurrentUserId();
  const [{ season, seasonBattle, chests, level, collection }, quick] = await Promise.all([loadLevel(userId), getQuickChests()]);
  if (!season || !seasonBattle) return null;

  const { gate } = season;
  const percentLeft = Math.round((1 - season.progress) * 100);

  return (
    <Panel label={`${gate.name}, the season boss`} variant={season.cleared ? "system" : "danger"}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className={cn("battle-awakened shrink-0")}>
            <MonsterArt monster={seasonBattle.monster.id} state={season.cleared ? "down" : "idle"} hp={Math.max(0, 1 - season.progress)} size={96} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-lg font-semibold">{seasonBattle.monster.name}</p>
            <p className="tabular text-xs text-muted-foreground">
              {season.cleared
                ? `Defeated on ${format(parseISO(season.clearedOn!), "EEE d MMM")}`
                : season.failed
                  ? "The season is over"
                  : `${season.daysLeft} day${season.daysLeft === 1 ? "" : "s"} left in ${format(parseISO(gate.weekStart), "MMMM")}`}
            </p>
          </div>
          <p className="tabular shrink-0 text-right text-xs text-muted-foreground">
            Reward
            <span className="block text-sm text-[#ff4d5e]">A Mythic chest</span>
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <div
            role="progressbar"
            aria-label={`Season boss health, ${percentLeft} percent left`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percentLeft}
            className="h-3 w-full bg-intensity-none"
          >
            <div
              className={cn("h-full border-r-2 border-white/60 transition-[width] duration-700", season.cleared ? "bg-intensity-low shadow-[0_0_10px_var(--intensity-low)]" : "bg-intensity-high shadow-[0_0_10px_var(--intensity-high)]")}
              style={{ width: `${percentLeft}%` }}
            />
          </div>
          <p className="tabular flex justify-between text-xs text-muted-foreground">
            <span>{season.damage.toLocaleString("en-US")} damage dealt this month</span>
            <span>{season.cleared ? "SEASON CLEARED" : `${season.hpLeft.toLocaleString("en-US")} HP left`}</span>
          </p>
        </div>

        {chests.enabled && (
          <ChestStrip
            kind="season"
            available={chests.available.filter((c) => c.kind === "season")}
            done={0}
            total={0}
            rank={level.rank}
            worn={collection.equipment}
            quick={quick}
          />
        )}

        <p className="text-xs text-muted-foreground">
          Everything you log all month counts, with the same bonuses as a weekly gate. It recovers if you stop for 3 days, so keep going.
        </p>
        <Link
          href="/dashboard/season"
          className="font-display inline-flex h-11 items-center justify-center border border-primary/40 bg-background/60 px-4 text-xs font-semibold tracking-wide hover:border-primary/70 hover:bg-primary/10"
        >
          Watch the season fight
        </Link>
      </div>
    </Panel>
  );
}
