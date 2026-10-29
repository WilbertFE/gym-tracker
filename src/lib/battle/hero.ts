import type { Power } from "@/lib/gates";
import type { Stat, StatId } from "@/lib/stats";

/**
 * The hero in a fight. Her stats are the five stats of the status window, which grow from training and are never
 * spent. Two of them change the damage (see `powerBefore` in `gates.ts`); the other three shape how she stands up to
 * the monster. None of them can make her lose: the fight is about how it looks and feels, and a gate is cleared by damage.
 */
export type HeroCombat = {
  /** The five stats, by id. */
  stats: Record<StatId, number>;
  /** Full stamina. 100 and then one more for every point of Endurance. */
  staminaMax: number;
  /** The stamina she is never knocked below, so a long fight cannot end her. */
  staminaFloor: number;
  /** The share of a strike Discipline stops, up to half. */
  block: number;
  /** The share of full stamina that comes back at the start of a new training day, from Vitality. */
  regen: number;
  /** What Strength and Agility give this week. */
  power: Power;
};

const value = (stats: readonly Stat[], id: StatId): number => stats.find((s) => s.id === id)?.value ?? 0;

export function heroCombat(stats: readonly Stat[], power: Power): HeroCombat {
  const endurance = value(stats, "endurance");
  const staminaMax = 100 + endurance;
  return {
    stats: {
      strength: value(stats, "strength"),
      endurance,
      vitality: value(stats, "vitality"),
      agility: value(stats, "agility"),
      discipline: value(stats, "discipline"),
    },
    staminaMax,
    staminaFloor: Math.ceil(staminaMax * 0.1),
    block: Math.min(0.5, value(stats, "discipline") / 200),
    regen: 0.1 + Math.min(0.3, value(stats, "vitality") / 300),
    power,
  };
}
