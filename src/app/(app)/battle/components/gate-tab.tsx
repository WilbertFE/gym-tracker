import { BattleStage } from "@/components/battle/battle-stage";
import { getCurrentUserId } from "@/lib/auth";
import { loadLevel } from "@/lib/level";

/** This week's gate as a turn based fight: every set you logged is a hit on the monster, in the order you did them. */
export async function GateTab() {
  const userId = await getCurrentUserId();
  const { battle, gate, level, collection } = await loadLevel(userId);

  if (!battle) {
    return (
      <p className="system-window p-4 text-sm text-muted-foreground">
        This week&apos;s gate is rank {gate.gate.rank.letter}, guarded by {gate.gate.boss}. The gate works as always: every set you log hurts the boss.
      </p>
    );
  }

  return <BattleStage battle={battle} level={level.level} rank={level.rank} equipment={collection.equipment} gateName={`${gate.gate.name}, rank ${gate.gate.rank.letter}`} />;
}
