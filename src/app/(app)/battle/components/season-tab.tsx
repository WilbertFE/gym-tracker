import { BattleStage } from "@/components/battle/battle-stage";
import { getCurrentUserId } from "@/lib/auth";
import { loadLevel } from "@/lib/level";

/** The season boss as a fight: one awakened monster for the whole month, hit by every set you log all month. */
export async function SeasonTab() {
  const userId = await getCurrentUserId();
  const { seasonBattle, season, level, collection } = await loadLevel(userId);

  if (!seasonBattle || !season) {
    return <p className="system-window p-4 text-sm text-muted-foreground">The first season starts on 1 November 2026. Until then there is no season boss.</p>;
  }

  return <BattleStage battle={seasonBattle} level={level.level} rank={level.rank} equipment={collection.equipment} gateName={`${season.gate.name}, the season boss`} />;
}
