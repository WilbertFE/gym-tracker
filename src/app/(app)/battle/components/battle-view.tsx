import Link from "next/link";
import { BattleChests } from "@/components/chest/battle-chests";
import { LockedFeature } from "@/components/locked-feature";
import { getCurrentUserId } from "@/lib/auth";
import { loadLevel } from "@/lib/level";
import { getQuickChests, getShowAll } from "@/lib/unlock-state";
import { activeTab, openTabs } from "@/lib/battle-tabs";
import { cn } from "@/lib/utils";
import { FriendsTab } from "./friends-tab";
import { GateTab } from "./gate-tab";
import { SeasonTab } from "./season-tab";

/**
 * All the fights in one place, one tab at a time. Only the open tab is built, so the page stays light. A tab is left out
 * until its feature has opened, and a link to one that is not open shows the first that is.
 */
export async function BattleView({ tab }: { tab?: string }) {
  const userId = await getCurrentUserId();
  const [{ level, chests, collection }, showAll, quick] = await Promise.all([loadLevel(userId), getShowAll(), getQuickChests()]);
  const open = openTabs(level.level, showAll);
  const active = activeTab(open, tab);
  if (!active) return <LockedFeature id="friends" level={level.level} totalXp={level.total} />;

  const battleChests = chests.available.filter((c) => c.kind === "gate" || c.kind === "season" || c.kind === "friends" || c.kind === "mvp");

  return (
    <div className="flex flex-col gap-6">
      {chests.enabled && <BattleChests available={battleChests} rank={level.rank} worn={collection.equipment} quick={quick} />}

      {open.length > 1 && (
        <nav aria-label="Fights" className="flex border-b" data-tour="battle-tabs">
          {open.map((t) => (
            <Link
              key={t.id}
              href={`/battle?tab=${t.id}`}
              aria-current={t.id === active ? "page" : undefined}
              className={cn(
                "flex min-h-11 flex-1 items-center justify-center border-b-2 px-4 text-sm transition-colors sm:flex-none",
                t.id === active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      )}

      {active === "gate" && <GateTab />}
      {active === "season" && <SeasonTab />}
      {active === "friends" && <FriendsTab />}
    </div>
  );
}
