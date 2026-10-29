import { format, parseISO } from "date-fns";
import { Panel } from "@/components/panel";
import { SystemTip } from "@/components/system-tip";
import { getCurrentUserId } from "@/lib/auth";
import { loadLevel } from "@/lib/level";
import { notice } from "@/lib/system-voice";
import { cn } from "@/lib/utils";

/**
 * The weekly gate: a boss with an HP bar that every set you log hurts. Clearing it before Sunday ends earns
 * XP, and a booster for the hard ones. Nothing to claim, it is worked out from the week's sets.
 */
export async function GatePanel() {
  const userId = await getCurrentUserId();
  const { gate: status } = await loadLevel(userId);
  const { gate } = status;
  const left = Math.max(0, gate.hp - status.damage);
  const percentLeft = Math.round((1 - status.progress) * 100);

  return (
    <div className="flex flex-col gap-4">
      <SystemTip id="gates" title={notice("Weekly gates unlocked")}>
        Every week a boss appears. Each set you log hurts it, and clearing it before Sunday earns XP and sometimes a booster.
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
                +{gate.rank.xp} XP{gate.rank.booster ? " and a booster" : ""}
              </span>
            </p>
          </div>

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

          <p className="text-xs text-muted-foreground">
            Each set deals its volume, weight times reps, as damage. A bodyweight rep counts 20.
          </p>
        </div>
      </Panel>
    </div>
  );
}
