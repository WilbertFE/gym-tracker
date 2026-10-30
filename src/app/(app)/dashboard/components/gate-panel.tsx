import { format, parseISO } from "date-fns";
import { Panel } from "@/components/panel";
import { SystemTip } from "@/components/system-tip";
import Link from "next/link";
import { HeroFigure } from "@/components/battle/hero-art";
import { MonsterArt } from "@/components/battle/monster-art";
import { ChestStrip } from "@/components/chest/chest-strip";
import { getCurrentUserId } from "@/lib/auth";
import { loadLevel } from "@/lib/level";
import { notice } from "@/lib/system-voice";
import { getQuickChests } from "@/lib/unlock-state";
import { cn } from "@/lib/utils";

/**
 * The weekly gate: a boss with an HP bar that every set you log hurts. Clearing it before Sunday ends earns
 * XP, and a booster for the hard ones. Nothing to claim, it is worked out from the week's sets.
 */
export async function GatePanel() {
  const userId = await getCurrentUserId();
  const [{ gate: status, battle, chests, level, collection }, quick] = await Promise.all([loadLevel(userId), getQuickChests()]);
  const { gate } = status;
  const left = Math.max(0, gate.hp - status.damage);
  const percentLeft = Math.round((1 - status.progress) * 100);

  return (
    <div className="flex flex-col gap-4">
      <SystemTip id="gates" title={notice("Weekly gates unlocked")}>
        Every week a boss appears. Each set you log hurts it, and clearing it before Sunday earns XP, a rare chest and sometimes a booster.
      </SystemTip>

      <Panel label={`${gate.name}, rank ${gate.rank.letter}`} variant={status.cleared ? "system" : "danger"} tour="gate">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <span
              aria-hidden
              className="tabular flex size-16 shrink-0 items-center justify-center border border-primary/60 text-3xl font-semibold text-primary [text-shadow:0_0_14px_var(--primary)]"
            >
              {gate.rank.letter}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-lg font-semibold">{gate.boss}</p>
              <p className="tabular text-xs text-muted-foreground">
                {status.cleared
                  ? `Defeated on ${format(parseISO(status.clearedOn!), "EEE d MMM")}`
                  : status.failed
                    ? "The gate closed"
                    : `${status.daysLeft} day${status.daysLeft === 1 ? "" : "s"} left`}
              </p>
            </div>
            <p className="tabular shrink-0 text-right text-xs text-muted-foreground">
              Reward
              <span className="block text-sm text-primary">
                +{gate.rank.xp} XP and a chest{gate.rank.booster ? ", plus a booster" : ""}
              </span>
            </p>
          </div>

          {battle && (
            <div className="flex flex-col gap-3 border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-end justify-center gap-4 overflow-hidden sm:gap-10">
                <HeroFigure rank={level.rank} equipment={collection.equipment} state={status.cleared ? "win" : "idle"} size={160} />
                <MonsterArt state={status.cleared ? "down" : "idle"} hp={Math.max(0, 1 - status.progress)} size={160} />
              </div>
              <p className="text-xs text-muted-foreground">
                {battle.turns.length === 0
                  ? `Every set you log is a hit on the ${battle.monster.name}.`
                  : `${battle.turns.length} set${battle.turns.length === 1 ? "" : "s"} so far this week. Your last: ${battle.turns.at(-1)!.damage.toLocaleString("en-US")} damage${battle.turns.at(-1)!.crit ? ", a critical hit" : ""}.`}
              </p>
              <Link
                href="/dashboard/gate"
                className="font-display inline-flex h-11 items-center justify-center border border-primary/40 bg-background/60 px-4 text-xs font-semibold tracking-wide hover:border-primary/70 hover:bg-primary/10"
              >
                Watch the fight
              </Link>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <div
              role="progressbar"
              aria-label={`Boss health, ${percentLeft} percent left`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percentLeft}
              className="h-3 w-full bg-intensity-none"
            >
              <div
                className={cn("h-full border-r-2 border-white/60 transition-[width] duration-700", status.cleared ? "bg-intensity-low shadow-[0_0_10px_var(--intensity-low)]" : "bg-intensity-high shadow-[0_0_10px_var(--intensity-high)]")}
                style={{ width: `${percentLeft}%` }}
              />
            </div>
            <p className="tabular flex justify-between text-xs text-muted-foreground">
              <span>
                {status.damage.toLocaleString("en-US")} damage dealt
              </span>
              <span>{status.cleared ? "GATE CLEARED" : `${left.toLocaleString("en-US")} HP left`}</span>
            </p>
          </div>

          {chests.enabled && (
            <ChestStrip
              kind="gate"
              available={chests.available.filter((c) => c.kind === "gate")}
              done={0}
              total={0}
              rank={level.rank}
              worn={collection.equipment}
              quick={quick}
            />
          )}

          <p className="text-xs text-muted-foreground">
            Each set deals its volume, weight times reps, as damage. A push up or pull up counts a share of your body weight.
          </p>
        </div>
      </Panel>
    </div>
  );
}
