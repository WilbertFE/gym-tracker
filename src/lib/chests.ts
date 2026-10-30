import type { QuestReward } from "@/lib/quests";
import { GRADE_ORDER, GRADES, gradeRank, itemsOfGrade, type Grade, type Item } from "@/lib/items";
import { addDaysISO, weekRange } from "@/lib/week";

/**
 * Chests. Finishing all three quests of a day earns a daily chest, all three of a week a weekly chest, and
 * clearing a weekly gate a gate chest. Each chest has a rarity of its own, shown by its color: the daily chest
 * is Common (white), the weekly one Uncommon (green) and the gate one Rare (blue), and a rarer chest has better
 * odds for rare items. Like XP, what has been earned is worked out from the logged data, and only an opened
 * chest is stored, so it can never be opened twice. An unopened chest expires after a while.
 */

/** Chests are earned for days from this one on, so nothing is handed out for the past. */
export const CHEST_START_DATE = "2026-10-29";

export type ChestKind = "daily" | "weekly" | "gate" | "friends" | "mvp" | "season";

/** The chest kinds, rarest last. */
export const CHEST_KINDS: readonly ChestKind[] = ["daily", "weekly", "gate", "friends", "mvp", "season"];

/** What each kind of chest is worth: its rarity, which colors it. The season chest, earned by beating a whole month's boss, is the only Mythic one. */
export const CHEST_TIER: Record<ChestKind, Grade> = { daily: "common", weekly: "uncommon", gate: "rare", friends: "rare", mvp: "epic", season: "mythic" };

/** The color of a chest, from its rarity. */
export const chestColor = (kind: ChestKind): string => GRADES[CHEST_TIER[kind]].color;

export const CHEST_NAMES: Record<ChestKind, string> = { daily: "Daily", weekly: "Weekly", gate: "Gate", friends: "Friends", mvp: "MVP", season: "Season" };

/** A chest can be opened this many days after it was earned. */
export const CHEST_EXPIRY_DAYS: Record<ChestKind, number> = { daily: 7, weekly: 14, gate: 14, friends: 14, mvp: 14, season: 28 };

/** Chance of each grade, in percent. Each kind adds up to 100. */
export const CHEST_ODDS: Record<ChestKind, Record<Grade, number>> = {
  // Mythic comes only from a season chest. The other chests have none, so the rarest item is still worth a month of training.
  daily: { common: 55, uncommon: 28, rare: 12, epic: 4, legendary: 1, mythic: 0 },
  weekly: { common: 15, uncommon: 35, rare: 30, epic: 14, legendary: 6, mythic: 0 },
  gate: { common: 0, uncommon: 20, rare: 45, epic: 25, legendary: 10, mythic: 0 },
  // The friends chest is for beating the weekly boss together; the MVP chest is for the three who dealt the most damage in a group of four or more.
  friends: { common: 0, uncommon: 25, rare: 45, epic: 22, legendary: 8, mythic: 0 },
  mvp: { common: 0, uncommon: 0, rare: 25, epic: 50, legendary: 25, mythic: 0 },
  season: { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 45, mythic: 55 },
};

/**
 * A run of bad luck ends: after `after` opened chests of a kind in a row below `atLeast`, the next one is
 * at least `atLeast`. Worked out from the opened chests, so nothing extra is stored.
 */
export const CHEST_PITY: Record<ChestKind, { after: number; atLeast: Grade }> = {
  daily: { after: 10, atLeast: "rare" },
  weekly: { after: 3, atLeast: "epic" },
  gate: { after: 2, atLeast: "epic" },
  friends: { after: 2, atLeast: "epic" },
  mvp: { after: 4, atLeast: "legendary" },
  // Every season chest is already Legendary or better, so there is nothing to make up for.
  season: { after: 1_000, atLeast: "legendary" },
};

export type Chest = {
  /** `d:2026-10-29` for a daily chest, `w:2026-10-26` (the week's Monday) for a weekly one, `g:2026-10-26` for that week's gate, `f:2026-10-26` or `t:2026-10-26` for that week's friends boss. */
  id: string;
  kind: ChestKind;
  /** The day the last quest was finished. */
  earnedOn: string;
  /** The last day it can be opened. */
  expiresOn: string;
};

export const chestKind = (id: string): ChestKind =>
  id.startsWith("w:") ? "weekly" : id.startsWith("g:") ? "gate" : id.startsWith("s:") ? "season" : id.startsWith("f:") ? "friends" : id.startsWith("t:") ? "mvp" : "daily";

export function chestId(kind: ChestKind, date: string): string {
  if (kind === "daily") return `d:${date}`;
  // A season chest is named after the first day of its month, the others after the Monday of their week.
  if (kind === "season") return `s:${date.slice(0, 7)}-01`;
  return `${{ gate: "g", friends: "f", mvp: "t", weekly: "w" }[kind]}:${weekRange(date).start}`;
}

/** A well formed chest id, or false. */
export const isChestId = (id: string): boolean => /^[dwgsft]:\d{4}-\d{2}-\d{2}$/.test(id);

/** The chests the quest bonus days have earned, oldest first. */
export function earnedChests(
  rewards: readonly Pick<QuestReward, "date" | "kind">[],
  start: string = CHEST_START_DATE,
): Chest[] {
  const chests = new Map<string, Chest>();
  for (const reward of rewards) {
    const kind: ChestKind | null = reward.kind === "daily-sweep" ? "daily" : reward.kind === "weekly-sweep" ? "weekly" : null;
    if (!kind || reward.date < start) continue;
    const id = chestId(kind, reward.date);
    chests.set(id, { id, kind, earnedOn: reward.date, expiresOn: addDaysISO(reward.date, CHEST_EXPIRY_DAYS[kind]) });
  }
  return [...chests.values()].sort((a, b) => a.earnedOn.localeCompare(b.earnedOn) || a.id.localeCompare(b.id));
}

/** The gate chests earned by cleared weekly gates, dated the day the boss fell, from `start` on. */
export function gateChests(
  gates: readonly { gate: { weekStart: string }; clearedOn: string | null }[],
  start: string = CHEST_START_DATE,
): Chest[] {
  return gates
    .filter((g): g is { gate: { weekStart: string }; clearedOn: string } => g.clearedOn !== null && g.clearedOn >= start)
    .map((g) => ({
      id: chestId("gate", g.gate.weekStart),
      kind: "gate" as const,
      earnedOn: g.clearedOn,
      expiresOn: addDaysISO(g.clearedOn, CHEST_EXPIRY_DAYS.gate),
    }));
}

/** The season chests earned by beaten season bosses, dated the day the boss fell, from `start` on. */
export function seasonChests(
  seasons: readonly { gate: { weekStart: string }; clearedOn: string | null }[],
  start: string = CHEST_START_DATE,
): Chest[] {
  return seasons
    .filter((s): s is { gate: { weekStart: string }; clearedOn: string } => s.clearedOn !== null && s.clearedOn >= start)
    .map((s) => ({
      id: chestId("season", s.gate.weekStart),
      kind: "season" as const,
      earnedOn: s.clearedOn,
      expiresOn: addDaysISO(s.clearedOn, CHEST_EXPIRY_DAYS.season),
    }));
}

export type AvailableChest = Chest & {
  /** Days left to open it, 0 on the last day. */
  daysLeft: number;
};

export type ChestState = {
  available: AvailableChest[];
  /** Earned, never opened and too late now. */
  expired: Chest[];
};

const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

export function chestState(chests: readonly Chest[], openedIds: ReadonlySet<string>, today: string): ChestState {
  const state: ChestState = { available: [], expired: [] };
  for (const chest of chests) {
    if (openedIds.has(chest.id)) continue;
    if (today > chest.expiresOn) state.expired.push(chest);
    else state.available.push({ ...chest, daysLeft: daysBetween(today, chest.expiresOn) });
  }
  return state;
}

/** One opened chest, as it is stored. */
export type Opening = {
  chest_id: string;
  item_id: string;
  grade: Grade;
  duplicate: boolean;
  /** XP paid for a duplicate, otherwise 0. */
  bonus_xp: number;
  opened_at: string;
  /** The day it was opened in the app's own calendar (`YYYY-MM-DD`), the date its XP counts on. */
  opened_on: string;
};

/** Whether the next chest of this kind is owed a good item. */
export function pityActive(kind: ChestKind, history: readonly Opening[]): boolean {
  const { after, atLeast } = CHEST_PITY[kind];
  const mine = history
    .filter((o) => chestKind(o.chest_id) === kind)
    .sort((a, b) => a.opened_at.localeCompare(b.opened_at) || a.chest_id.localeCompare(b.chest_id));
  let misses = 0;
  for (let i = mine.length - 1; i >= 0; i--) {
    if (gradeRank(mine[i].grade) >= gradeRank(atLeast)) break;
    misses += 1;
  }
  return misses >= after;
}

/** The odds the next chest of this kind really has, in percent, after the pity rule. */
export function effectiveOdds(kind: ChestKind, history: readonly Opening[]): Record<Grade, number> {
  const pity = pityActive(kind, history);
  const raw = { ...CHEST_ODDS[kind] };
  if (!pity) return raw;
  const floor = gradeRank(CHEST_PITY[kind].atLeast);
  for (const grade of GRADE_ORDER) if (gradeRank(grade) < floor) raw[grade] = 0;
  const total = GRADE_ORDER.reduce((sum, g) => sum + raw[g], 0);
  for (const grade of GRADE_ORDER) raw[grade] = (raw[grade] / total) * 100;
  return raw;
}

export type Roll = {
  item: Item;
  grade: Grade;
  /** The user already owned the whole grade, so this is a repeat that pays XP instead. */
  duplicate: boolean;
  bonusXp: number;
};

/** A uniform number in [0, 1) from the system's secure random source. */
export function secureRandom(): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] / 2 ** 32;
}

/**
 * What a chest holds. The grade comes from the odds (with the pity rule), then an item of that grade the
 * user does not own yet. Only when the whole grade is owned can a repeat come up, and it pays XP.
 * `rng` returns a number in [0, 1) and is injected so tests are exact.
 */
export function rollChest(input: {
  kind: ChestKind;
  owned: ReadonlySet<string>;
  history: readonly Opening[];
  rng: () => number;
}): Roll {
  const odds = effectiveOdds(input.kind, input.history);
  const total = GRADE_ORDER.reduce((sum, g) => sum + odds[g], 0);
  let pick = input.rng() * total;
  // The last grade that can come up, in case rounding leaves a sliver at the top.
  let grade: Grade = [...GRADE_ORDER].reverse().find((g) => odds[g] > 0) ?? GRADE_ORDER[0];
  for (const candidate of GRADE_ORDER) {
    if (odds[candidate] <= 0) continue;
    if (pick < odds[candidate]) {
      grade = candidate;
      break;
    }
    pick -= odds[candidate];
  }

  const pool = itemsOfGrade(grade);
  const fresh = pool.filter((item) => !input.owned.has(item.id));
  const choices = fresh.length > 0 ? fresh : pool;
  const item = choices[Math.min(choices.length - 1, Math.floor(input.rng() * choices.length))];
  const duplicate = fresh.length === 0;
  return { item, grade, duplicate, bonusXp: duplicate ? GRADES[grade].duplicateXp : 0 };
}
