import Link from "next/link";
import { MonsterArt } from "@/components/battle/monster-art";
import { Panel } from "@/components/panel";
import { getCurrentUserId } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { friendBossFor } from "@/lib/friends";
import { loadLevel } from "@/lib/level";
import { weekRange } from "@/lib/week";
import { cn } from "@/lib/utils";

const linkClass =
  "font-display inline-flex h-11 items-center justify-center border border-primary/40 bg-background/60 px-4 text-xs font-semibold tracking-wide hover:border-primary/70 hover:bg-primary/10";

/** The friends boss on the dashboard: the shared health bar, or an invitation to get a friend code. */
export async function FriendBossPanel() {
  const userId = await getCurrentUserId();
  const { friends } = await loadLevel(userId);
  if (!friends.available) return null;

  const today = todayISO();
  const boss = friends.card ? friendBossFor(friends.members, weekRange(today).start, today) : null;

  if (!boss) {
    return (
      <Panel label="Friends boss" variant="plain">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {friends.card ? "Add a friend and fight one boss together every week." : "Add friends with a code and fight one boss together every week."}
          </p>
          <Link href="/friends" className={cn(linkClass, "self-start")}>
            {friends.card ? "Add a friend" : "Get started"}
          </Link>
        </div>
      </Panel>
    );
  }

  const percentLeft = Math.round((1 - boss.progress) * 100);
  const mine = boss.members.find((m) => m.isMe);

  return (
    <Panel label={`${boss.monster.name}, the friends boss`} variant={boss.cleared ? "system" : "danger"}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="battle-awakened shrink-0">
            <MonsterArt monster={boss.monster.id} state={boss.cleared ? "down" : "idle"} hp={Math.max(0, 1 - boss.progress)} size={80} />
          </div>
          <p className="tabular text-xs text-muted-foreground">
            {boss.members.length} fighters. You dealt {(mine?.damage ?? 0).toLocaleString("en-US")}.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <div
            role="progressbar"
            aria-label={`Friends boss health, ${percentLeft} percent left`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percentLeft}
            className="h-3 w-full bg-intensity-none"
          >
            <div
              className={cn("h-full border-r-2 border-white/60 transition-[width] duration-700", boss.cleared ? "bg-intensity-low shadow-[0_0_10px_var(--intensity-low)]" : "bg-intensity-high shadow-[0_0_10px_var(--intensity-high)]")}
              style={{ width: `${percentLeft}%` }}
            />
          </div>
          <p className="tabular flex justify-between text-xs text-muted-foreground">
            <span>{boss.damage.toLocaleString("en-US")} damage together</span>
            <span>{boss.cleared ? "CLEARED" : `${boss.hpLeft.toLocaleString("en-US")} HP left`}</span>
          </p>
        </div>
        <Link href="/friends/boss" className={linkClass}>
          See the friends boss
        </Link>
      </div>
    </Panel>
  );
}
