import { format, parseISO } from "date-fns";
import { Panel } from "@/components/panel";
import { SystemTip } from "@/components/system-tip";
import Link from "next/link";
import { HeroFigure } from "@/components/battle/hero-art";
import { MonsterArt } from "@/components/battle/monster-art";
import { BattleChests } from "@/components/chest/battle-chests";
import { getCurrentUserId } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { friendBossFor } from "@/lib/friends";
import { loadLevel } from "@/lib/level";
import { MUSCLE_LABELS, type MuscleGroup } from "@/lib/muscles";
import { notice } from "@/lib/system-voice";
import { WEAK_POINT_BONUS } from "@/lib/gates";
import { getQuickChests } from "@/lib/unlock-state";
import { weekRange } from "@/lib/week";
import { cn } from "@/lib/utils";

const linkClass =
  "font-display inline-flex h-11 items-center justify-center border border-primary/40 bg-background/60 px-4 text-xs font-semibold tracking-wide hover:border-primary/70 hover:bg-primary/10";

/** A fight as one short row: the monster, what it is, how much HP it has left, and a link to its tab on the Battle page. */
function FightRow({ tab, monster, title, line, percentLeft, cleared }: { tab: string; monster: string; title: string; line: string; percentLeft: number; cleared: boolean }) {
  return (
    <li>
      <Link href={`/battle?tab=${tab}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 hover:bg-primary/5">
        <span className="battle-awakened shrink-0">
          <MonsterArt monster={monster} state={cleared ? "down" : "idle"} hp={Math.max(0, percentLeft / 100)} size={52} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-sm font-medium">{title}</span>
          <span
            role="progressbar"
            aria-label={`${title}, ${percentLeft} percent left`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percentLeft}
            className="block h-2 w-full bg-intensity-none"
          >
            <span
              className={cn("block h-full border-r border-white/60", cleared ? "bg-intensity-low" : "bg-intensity-high")}
              style={{ width: `${percentLeft}%` }}
            />
          </span>
          <span className="tabular text-xs text-muted-foreground">{line}</span>
        </span>
      </Link>
    </li>
  );
}

/**
 * The fights on the dashboard, in one card: this week's gate in full (a boss with an HP bar that every set you log hurts, worth XP
 * and a chest), then the season boss and the friends boss as short rows, each leading to its tab on the Battle page. One line
 * shows the chests the fights earned. Nothing to claim, it is all worked out from the sets.
 */
export async function BattlesPanel({ gates, withFriends }: { gates: boolean; withFriends: boolean }) {
  const userId = await getCurrentUserId();
  const [{ gate: status, battle, chests, level, collection, season, seasonBattle, friends }, quick] = await Promise.all([loadLevel(userId), getQuickChests()]);
  const { gate } = status;
  const today = todayISO();
  const friendBoss = withFriends && friends.card ? friendBossFor(friends.members, weekRange(today).start, today) : null;
  const battleChests = chests.available.filter((c) => c.kind === "gate" || c.kind === "season" || c.kind === "friends" || c.kind === "mvp");
  const rows = (gates && season && seasonBattle) || (withFriends && friends.available);
  const left = status.hpLeft;
  const percentLeft = Math.round((1 - status.progress) * 100);

  return (
    <div className="flex flex-col gap-4">
      {chests.enabled && <BattleChests available={battleChests} rank={level.rank} worn={collection.equipment} quick={quick} />}

      {gates && (
        <>
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
                <MonsterArt monster={battle.monster.id} state={status.cleared ? "down" : "idle"} hp={Math.max(0, 1 - status.progress)} size={160} />
              </div>
              <p className="tabular text-xs">
                <span className="uppercase tracking-widest text-muted-foreground">Weak point </span>
                {MUSCLE_LABELS[battle.weakMuscle as MuscleGroup]} <span className="text-primary">+{Math.round(WEAK_POINT_BONUS * 100)}% damage</span>
                {status.healed > 0 && <span className="text-muted-foreground"> · it recovered {status.healed.toLocaleString("en-US")} HP while you rested</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                {battle.turns.length === 0
                  ? `Every set you log is a hit on the ${battle.monster.name}.`
                  : `${battle.turns.length} set${battle.turns.length === 1 ? "" : "s"} so far this week. Your last: ${battle.turns.at(-1)!.damage.toLocaleString("en-US")} damage${battle.turns.at(-1)!.crit ? ", a critical hit" : ""}.`}
              </p>
              <Link
                href="/battle?tab=gate"
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

          <p className="text-xs text-muted-foreground">
            Each set deals its volume, weight times reps, as damage. A push up or pull up counts a share of your body weight.
          </p>
        </div>
      </Panel>
        </>
      )}

      {rows && (
        <Panel label="Other fights" variant="plain" tour="other-fights">
          <ul className="divide-y">
            {gates && season && seasonBattle && (
              <FightRow
                tab="season"
                monster={seasonBattle.monster.id}
                title={`${seasonBattle.monster.name}, the season boss`}
                line={season.cleared ? "Defeated. A Mythic chest earned." : `${season.daysLeft} day${season.daysLeft === 1 ? "" : "s"} left this month. Reward: a Mythic chest.`}
                percentLeft={Math.round((1 - season.progress) * 100)}
                cleared={season.cleared}
              />
            )}
            {withFriends && friends.available && friendBoss && (
              <FightRow
                tab="friends"
                monster={friendBoss.monster.id}
                title={`${friendBoss.monster.name}, with friends`}
                line={`${friendBoss.members.length} fighters. You dealt ${(friendBoss.members.find((m) => m.isMe)?.damage ?? 0).toLocaleString("en-US")}.`}
                percentLeft={Math.round((1 - friendBoss.progress) * 100)}
                cleared={friendBoss.cleared}
              />
            )}
          </ul>
          {withFriends && friends.available && !friendBoss && (
            <div className={cn("flex flex-col gap-3", gates && season && seasonBattle && "mt-3 border-t pt-3")}>
              <p className="text-sm text-muted-foreground">
                {friends.card ? "Add a friend and fight one boss together every week." : "Add friends with a code and fight one boss together every week."}
              </p>
              <Link href="/friends" className={cn(linkClass, "self-start")}>
                {friends.card ? "Add a friend" : "Get started"}
              </Link>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
