import { CheckIcon } from "@phosphor-icons/react/ssr";
import { Panel } from "@/components/panel";
import { SystemTip } from "@/components/system-tip";
import { getCurrentUserId } from "@/lib/auth";
import { loadLevel } from "@/lib/level";
import { getQuickChests } from "@/lib/unlock-state";
import { ChestStrip } from "@/components/chest/chest-strip";
import type { QuestStatus } from "@/lib/quests";
import { SYSTEM, notice } from "@/lib/system-voice";
import { cn } from "@/lib/utils";

function QuestRow({ status }: { status: QuestStatus }) {
  const { quest, value, done } = status;
  const shown = Math.min(value, quest.target);
  const percent = Math.round((shown / quest.target) * 100);

  return (
    <li className="flex items-center gap-3 py-3">
      <span
        aria-hidden
        className={cn(
          "flex size-6 shrink-0 items-center justify-center border",
          done ? "border-primary bg-primary text-primary-foreground" : "text-transparent",
        )}
      >
        <CheckIcon className="size-4" weight="bold" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <p className={cn("text-sm", done && "text-muted-foreground line-through decoration-1")}>{quest.title}</p>
          <p className="tabular shrink-0 text-xs text-muted-foreground">
            {shown} / {quest.target}
          </p>
        </div>
        <div
          role="progressbar"
          aria-label={`${quest.title}, ${shown} of ${quest.target}`}
          aria-valuemin={0}
          aria-valuemax={quest.target}
          aria-valuenow={shown}
          className="h-1 w-full bg-intensity-none"
        >
          <div className={cn("h-full transition-[width] duration-500", done ? "bg-primary shadow-[0_0_10px_var(--primary)]" : "bg-primary/60")} style={{ width: `${percent}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">{quest.hint}</p>
      </div>

      <span
        className={cn(
          "tabular shrink-0 border px-1.5 py-0.5 text-[11px] uppercase tracking-widest",
          done ? "border-primary text-primary" : "text-muted-foreground",
        )}
      >
        {done ? SYSTEM.questComplete : `+${quest.xp} XP`}
      </span>
    </li>
  );
}

function Sweep({ done, xp }: { done: boolean; xp: number }) {
  return (
    <p
      className={cn(
        "tabular mt-1 flex items-center justify-between gap-3 border-t pt-3 text-xs",
        done ? "text-primary" : "text-muted-foreground",
      )}
    >
      <span>{done ? SYSTEM.questsComplete : "Finish them all for a bonus"}</span>
      <span className="uppercase tracking-widest">+{xp} XP</span>
    </p>
  );
}

/** Today's three quests and this week's three, with progress. Quests earn XP on their own, nothing to claim. */
export async function QuestsPanel() {
  const userId = await getCurrentUserId();
  const [{ quests, chests, level, collection }, quick] = await Promise.all([loadLevel(userId), getQuickChests()]);
  const strip = (kind: "daily" | "weekly") => {
    const set = kind === "daily" ? quests.daily : quests.weekly;
    return (
      <ChestStrip
        kind={kind}
        available={chests.available.filter((c) => c.kind === kind)}
        done={set.filter((s) => s.done).length}
        total={set.length}
        rank={level.rank}
        worn={collection.equipment}
        quick={quick}
      />
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <SystemTip id="quests" title={notice("Quests unlocked")}>
        Three small goals every day and week. They tick themselves as you log, and finishing them earns bonus XP.
      </SystemTip>
      {chests.enabled && (
        <SystemTip id="chests" title={notice("Chests unlocked")}>
          Finish all three quests of a day for a chest with a random item. A weekly chest is a rarer chest, with better odds for rare items.
        </SystemTip>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Panel label="Daily quests" variant="system" tour="quests">
          <ul className="flex flex-col divide-y" aria-label="Daily quests">
            {quests.recovery && <QuestRow key={quests.recovery.quest.id} status={quests.recovery} />}
            {quests.daily.map((s) => (
              <QuestRow key={s.quest.id} status={s} />
            ))}
          </ul>
          <Sweep done={quests.dailySweep.done} xp={quests.dailySweep.xp} />
          {chests.enabled && strip("daily")}
          <p className="mt-2 text-xs text-muted-foreground">New quests tomorrow.</p>
        </Panel>

        <Panel label="Weekly quests" variant="system">
          <ul className="flex flex-col divide-y" aria-label="Weekly quests">
            {quests.weekly.map((s) => (
              <QuestRow key={s.quest.id} status={s} />
            ))}
          </ul>
          <Sweep done={quests.weeklySweep.done} xp={quests.weeklySweep.xp} />
          {chests.enabled && strip("weekly")}
          <p className="mt-2 text-xs text-muted-foreground">
            {quests.daysLeft} day{quests.daysLeft === 1 ? "" : "s"} left this week.
          </p>
        </Panel>
      </div>
    </div>
  );
}
