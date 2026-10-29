import { LockedFeature } from "@/components/locked-feature";
import { Panel } from "@/components/panel";
import { RankBadge } from "@/components/rank-badge";
import { StatsRadar } from "@/components/stats-radar";
import { SystemTip } from "@/components/system-tip";
import { getCurrentUserId } from "@/lib/auth";
import { AuraArt } from "@/components/items/aura-art";
import { Nameplate } from "@/components/items/nameplate";
import { auraKindFor } from "@/lib/item-art";
import { itemById, type FrameStyle } from "@/lib/items";
import { loadLevel } from "@/lib/level";
import { notice } from "@/lib/system-voice";
import { totalStats } from "@/lib/stats";
import { isUnlocked } from "@/lib/unlocks";
import { getShowAll } from "@/lib/unlock-state";
import { MuscleLevels, Titles } from "./collection";


/** The status window: rank letter, level, and five stats with a radar and a line each. */
export async function StatusView() {
  const userId = await getCurrentUserId();
  const [{ level, stats, muscles, titles, title, collection }, showAll] = await Promise.all([loadLevel(userId), getShowAll()]);
  if (!isUnlocked("status", level.level, showAll)) {
    return <LockedFeature id="status" level={level.level} totalXp={level.total} />;
  }

  const frame = collection.equipment.frame ? itemById(collection.equipment.frame) : null;
  const aura = collection.equipment.aura ? itemById(collection.equipment.aura) : null;
  const plate = collection.equipment.plate ? itemById(collection.equipment.plate) : null;

  // Bars are drawn against a ceiling a little above the best stat, so the shape is easy to read.
  const ceiling = Math.max(60, Math.ceil((Math.max(...stats.map((s) => s.value)) * 1.2) / 10) * 10);

  return (
    <div className="flex flex-col gap-6">
      <SystemTip id="status" title={notice("Status window unlocked")}>
        Your five stats grow as you train. Each one rises with a different habit, so the shape shows what kind of trainer you are.
      </SystemTip>

      <Panel label="Rank" variant="system">
        <div className="flex items-center gap-5">
          {aura ? (
            <span className="flex size-[140px] shrink-0 items-center justify-center">
              <AuraArt color={aura.value} kind={auraKindFor(aura.id)} size={104} animated>
                <RankBadge rank={level.rank} size={104} decor={(frame?.value as FrameStyle | undefined) ?? null} />
              </AuraArt>
            </span>
          ) : (
            <RankBadge rank={level.rank} size={104} decor={(frame?.value as FrameStyle | undefined) ?? null} />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="tabular text-[11px] uppercase tracking-widest text-muted-foreground">{level.rank.name}</p>
            <p className="tabular text-6xl font-bold leading-none text-primary [text-shadow:0_0_22px_var(--primary)]" aria-label={`Rank ${level.rank.letter}`} style={aura ? { color: aura.value, textShadow: `0 0 22px ${aura.value}` } : undefined}>
              {level.rank.letter}
            </p>
            <p className="tabular text-sm text-muted-foreground">
              Level {level.level}, {level.total.toLocaleString("en-US")} XP
            </p>
            {plate && (
              <p>
                <Nameplate text={plate.value} grade={plate.grade} />
              </p>
            )}
          </div>
        </div>
      </Panel>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Panel label="Stats" variant="system">
          <ul className="flex flex-col divide-y">
            {stats.map((stat) => (
              <li key={stat.id} className="flex flex-col gap-1.5 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium">{stat.name}</p>
                  <p className="tabular text-2xl font-semibold leading-none">{stat.value}</p>
                </div>
                <div
                  role="progressbar"
                  aria-label={`${stat.name} ${stat.value}`}
                  aria-valuemin={0}
                  aria-valuemax={ceiling}
                  aria-valuenow={Math.min(stat.value, ceiling)}
                  className="h-1.5 w-full bg-intensity-none"
                >
                  <div className="h-full bg-primary shadow-[0_0_10px_var(--primary)]" style={{ width: `${Math.min(100, (stat.value / ceiling) * 100)}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">{stat.raisedBy}</p>
                <p className="tabular text-[11px] text-muted-foreground">{stat.detail}</p>
              </li>
            ))}
          </ul>
          <p className="tabular mt-3 border-t pt-3 text-xs text-muted-foreground">
            Total {totalStats(stats)}
          </p>
        </Panel>

        <Panel label="Shape" variant="system">
          <StatsRadar stats={stats.map((s) => ({ name: s.name, value: s.value }))} max={ceiling} />
        </Panel>
      </div>

      {isUnlocked("titles", level.level, showAll) && <Titles titles={titles} worn={title} />}
      {isUnlocked("muscleLevels", level.level, showAll) && <MuscleLevels muscles={muscles} />}
    </div>
  );
}
