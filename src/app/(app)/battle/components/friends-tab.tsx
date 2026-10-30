import { addDays, format, parseISO } from "date-fns";
import Link from "next/link";
import { MonsterArt } from "@/components/battle/monster-art";
import { Panel } from "@/components/panel";
import { getCurrentUserId } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { friendBossFor, MVP_MIN_GROUP, MVP_PLACES } from "@/lib/friends";
import { loadLevel } from "@/lib/level";
import { weekRange } from "@/lib/week";
import { cn } from "@/lib/utils";

const linkClass =
  "font-display inline-flex h-11 items-center justify-center border border-primary/40 bg-background/60 px-4 text-xs font-semibold tracking-wide hover:border-primary/70 hover:bg-primary/10";

/** The weekly boss you fight with your friends: the monster, the shared health bar and what each of you did. */
export async function FriendsTab() {
  const userId = await getCurrentUserId();
  const { friends } = await loadLevel(userId);
  const today = todayISO();

  if (!friends.available) {
    return (
      <Panel label="Friends boss">
        <p className="text-sm text-muted-foreground">Friends are not set up yet. The boss appears here as soon as the database is updated.</p>
      </Panel>
    );
  }
  if (!friends.card) {
    return (
      <Panel label="Friends boss" variant="system">
        <div className="flex flex-col gap-3">
          <p className="text-sm">Get a friend code and add a friend to fight a weekly boss together.</p>
          <Link href="/friends" className={cn(linkClass, "self-start")}>
            Go to Friends
          </Link>
        </div>
      </Panel>
    );
  }

  const week = weekRange(today).start;
  const boss = friendBossFor(friends.members, week, today);
  const lastWeek = friendBossFor(friends.members, format(addDays(parseISO(week), -7), "yyyy-MM-dd"), today);
  const daysLeft = boss ? Math.max(0, Math.round((Date.parse(boss.weekEnd) - Date.parse(today)) / 86_400_000)) + 1 : 0;

  return (
    <div className="flex flex-col gap-6">
      {boss ? (
        <Panel label={`${boss.monster.name}, the friends boss`} variant={boss.cleared ? "system" : "danger"}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="battle-awakened shrink-0">
                <MonsterArt monster={boss.monster.id} state={boss.cleared ? "down" : "idle"} hp={Math.max(0, 1 - boss.progress)} size={110} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="text-lg font-semibold">{boss.monster.name}</p>
                <p className="tabular text-xs text-muted-foreground">
                  {boss.cleared ? "Defeated, by all of you" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`} · {boss.members.length} fighters
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div
                role="progressbar"
                aria-label={`Friends boss health, ${Math.round((1 - boss.progress) * 100)} percent left`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round((1 - boss.progress) * 100)}
                className="h-3 w-full bg-intensity-none"
              >
                <div
                  className={cn("h-full border-r-2 border-white/60 transition-[width] duration-700", boss.cleared ? "bg-intensity-low shadow-[0_0_10px_var(--intensity-low)]" : "bg-intensity-high shadow-[0_0_10px_var(--intensity-high)]")}
                  style={{ width: `${Math.round((1 - boss.progress) * 100)}%` }}
                />
              </div>
              <p className="tabular flex justify-between text-xs text-muted-foreground">
                <span>{boss.damage.toLocaleString("en-US")} damage together</span>
                <span>{boss.cleared ? "CLEARED" : `${boss.hpLeft.toLocaleString("en-US")} HP left`}</span>
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              Everyone adds the damage of their gate sets this week. Beat it before Sunday ends and each of you who dealt damage gets a Friends chest
              {boss.members.length >= MVP_MIN_GROUP ? `, and the top ${MVP_PLACES} get an MVP chest instead` : ` (a group of ${MVP_MIN_GROUP} or more also gives the top ${MVP_PLACES} a better MVP chest)`}. Chests arrive on Monday, when the week is settled.
            </p>
          </div>
        </Panel>
      ) : (
        <Panel label="Friends boss" variant="system">
          <div className="flex flex-col gap-3">
            <p className="text-sm">
              {friends.members.length > 1
                ? "Your new friends start to count next Monday, so the group is the same all week."
                : "You need at least one friend to fight the weekly boss."}
            </p>
            <Link href="/friends" className={cn(linkClass, "self-start")}>
              Add a friend
            </Link>
          </div>
        </Panel>
      )}

      {boss && (
        <Panel label="Who did what" variant="plain">
          <table className="w-full text-sm">
            <caption className="sr-only">Damage dealt to the friends boss this week, most first</caption>
            <thead>
              <tr className="tabular text-[11px] uppercase tracking-widest text-muted-foreground">
                <th scope="col" className="py-1 text-left font-normal">
                  Fighter
                </th>
                <th scope="col" className="py-1 text-right font-normal">
                  Damage
                </th>
                <th scope="col" className="py-1 text-right font-normal">
                  Share
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {boss.members.map((m) => (
                <tr key={m.userId} className={m.isMe ? "text-primary" : undefined}>
                  <th scope="row" className="py-2 text-left font-medium">
                    {m.place > 0 && <span className="tabular mr-2 text-muted-foreground">{m.place}</span>}
                    {m.name}
                    {m.isMe && <span className="ml-2 text-xs text-muted-foreground">you</span>}
                    <span className="tabular ml-2 text-xs font-normal text-muted-foreground">level {m.level}</span>
                  </th>
                  <td className="tabular py-2 text-right">{m.damage.toLocaleString("en-US")}</td>
                  <td className="tabular py-2 text-right">{Math.round(m.share * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted-foreground">
            A friend&apos;s damage updates when they open the app, so it can be a little behind. Your own is always current.
          </p>
        </Panel>
      )}

      {lastWeek && (
        <Panel label="Last week" variant="plain">
          <p className="text-sm">
            {lastWeek.monster.name}: {lastWeek.cleared ? "defeated" : "survived"} with {lastWeek.damage.toLocaleString("en-US")} of {lastWeek.hp.toLocaleString("en-US")} damage.
          </p>
        </Panel>
      )}

      <nav aria-label="Related" className="flex flex-wrap gap-x-6">
        <Link href="/friends" className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          Friends and your code
        </Link>
      </nav>
    </div>
  );
}
