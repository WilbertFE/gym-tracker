import { isUnlocked, type FeatureId } from "@/lib/unlocks";

/** The fights on the Battle page, in order. The gate and the season open with the gates (level 26), the friends boss with Friends (level 18). */
export const BATTLE_TABS = [
  { id: "gate", label: "This week", feature: "gates" },
  { id: "season", label: "Season", feature: "gates" },
  { id: "friends", label: "With friends", feature: "friends" },
] as const satisfies readonly { id: string; label: string; feature: FeatureId }[];

export type BattleTab = (typeof BATTLE_TABS)[number]["id"];

/** The tabs a player can see: one whose feature has not opened yet is left out. */
export const openTabs = (level: number, showAll: boolean) => BATTLE_TABS.filter((t) => isUnlocked(t.feature, level, showAll));

/** The tab to show: the one asked for if it is open, otherwise the first that is. Null when nothing is open yet. */
export function activeTab(open: readonly { id: BattleTab }[], requested: string | undefined): BattleTab | null {
  return open.find((t) => t.id === requested)?.id ?? open[0]?.id ?? null;
}
