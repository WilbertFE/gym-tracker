import { LockedFeature } from "@/components/locked-feature";
import { ChestStrip } from "@/components/chest/chest-strip";
import { Panel } from "@/components/panel";
import { getCurrentUserId } from "@/lib/auth";
import { CHEST_EXPIRY_DAYS, CHEST_KINDS, CHEST_NAMES, CHEST_ODDS, CHEST_PITY, CHEST_TIER, chestColor, chestKind, type ChestKind } from "@/lib/chests";
import { GRADE_ORDER, GRADES, itemById, ITEMS, type Grade } from "@/lib/items";
import { loadLevel } from "@/lib/level";
import { getProfile } from "@/lib/repositories/profiles";
import { isUnlocked } from "@/lib/unlocks";
import { getQuickChests, getShowAll } from "@/lib/unlock-state";
import { CollectionClient } from "./collection-client";

const gradeStyle = (grade: Grade) => ({ color: GRADES[grade].color });

/** Chests waiting, what is worn, every item by grade, the odds and what was opened. */
export async function CollectionView() {
  const userId = await getCurrentUserId();
  const [{ level, chests, collection, quests, title }, showAll, quick, { profile }] = await Promise.all([
    loadLevel(userId),
    getShowAll(),
    getQuickChests(),
    getProfile(userId),
  ]);
  if (!isUnlocked("collection", level.level, showAll)) {
    return <LockedFeature id="collection" level={level.level} totalXp={level.total} />;
  }

  const worn = collection.equipment;
  const displayName = profile?.display_name ?? "You";
  const history = [...chests.openings].sort((a, b) => b.opened_at.localeCompare(a.opened_at)).slice(0, 8);
  const strip = (kind: ChestKind) => {
    const set = kind === "daily" ? quests.daily : kind === "weekly" ? quests.weekly : [];
    return (
      <ChestStrip
        kind={kind}
        available={chests.available.filter((c) => c.kind === kind)}
        done={set.filter((s) => s.done).length}
        total={set.length}
        rank={level.rank}
        worn={worn}
        quick={quick}
      />
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <Panel label="Chests" variant="system" tour="chests">
        {chests.enabled ? (
          <>
            <p className="text-sm text-muted-foreground">
              Finish all three quests of a day for a daily chest, all three of a week for a weekly chest, and clear the weekly gate for a gate chest. A chest has a rarity, shown by its
              color: daily is Common, weekly is Uncommon and gate is Rare, and a rarer chest has better odds. You can open one for {CHEST_EXPIRY_DAYS.daily} days (daily) or{" "}
              {CHEST_EXPIRY_DAYS.weekly} days (weekly and gate) after you earn it.
            </p>
            {strip("daily")}
            {strip("weekly")}
            {strip("gate")}
            {strip("friends")}
            {strip("mvp")}
            {strip("season")}
            {chests.expired.length > 0 && (
              <p className="tabular mt-3 text-xs text-muted-foreground">
                {chests.expired.length} chest{chests.expired.length === 1 ? "" : "es"} ran out before they were opened.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Chests are not set up yet. They appear here as soon as the database is updated.</p>
        )}
      </Panel>

      <CollectionClient rank={level.rank} level={level.level} name={displayName} title={title} owned={collection.owned} worn={worn} />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Panel label="The odds" variant="plain" tour="odds">
          <table className="w-full text-sm">
            <caption className="sr-only">Chance of each grade, by chest</caption>
            <thead>
              <tr className="tabular text-[11px] uppercase tracking-widest text-muted-foreground">
                <th scope="col" className="py-1 text-left font-normal">
                  Grade
                </th>
                {CHEST_KINDS.map((kind) => (
                  <th key={kind} scope="col" className="py-1 text-right font-normal" style={{ color: chestColor(kind) }}>
                    {CHEST_NAMES[kind]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {GRADE_ORDER.map((grade) => (
                <tr key={grade}>
                  <th scope="row" className="py-2 text-left font-medium" style={gradeStyle(grade)}>
                    {GRADES[grade].name}
                  </th>
                  {CHEST_KINDS.map((kind) => (
                    <td key={kind} className="tabular py-2 text-right">
                      {CHEST_ODDS[kind][grade]}%
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="mt-3 flex list-disc flex-col gap-1 pl-4 text-xs text-muted-foreground">
            <li>
              Bad luck ends: after {CHEST_PITY.daily.after} daily chests without a {GRADES[CHEST_PITY.daily.atLeast].name} item, the next one has one. For weekly chests it is{" "}
              {CHEST_PITY.weekly.after} chests and an {GRADES[CHEST_PITY.weekly.atLeast].name} item, and for gate chests {CHEST_PITY.gate.after} chests and an {GRADES[CHEST_PITY.gate.atLeast].name} item.
            </li>
            <li>A chest never gives you an item you own while one of that grade is still missing.</li>
            <li>
              Once you own every item of a grade, a repeat pays XP instead: {GRADE_ORDER.map((g) => `${GRADES[g].name} ${GRADES[g].duplicateXp}`).join(", ")}.
            </li>
            <li>
              {GRADES.mythic.name} is the rarest grade, and only a season chest can drop it. The chests are {CHEST_KINDS.map((k) => `${CHEST_NAMES[k]} (${GRADES[CHEST_TIER[k]].name})`).join(", ")}.
            </li>
            <li>Items only change how things look. They never change how much XP you earn.</li>
            <li>{ITEMS.length} items to find.</li>
          </ul>
        </Panel>

        <Panel label="Opened" variant="plain" tour="opened">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing opened yet. Your first chest is waiting for you to finish a day of quests.</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {history.map((o) => {
                const item = itemById(o.item_id);
                return (
                  <li key={o.chest_id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0">
                      <span style={gradeStyle(o.grade)} className="font-medium">
                        {item?.name ?? "An item"}
                      </span>
                      <span className="tabular ml-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                        {GRADES[o.grade].name}
                        {o.duplicate ? `, repeat, +${o.bonus_xp} XP` : ""}
                      </span>
                    </span>
                    <span className="tabular shrink-0 text-xs text-muted-foreground">
                      {CHEST_NAMES[chestKind(o.chest_id)]}, {o.opened_on}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
