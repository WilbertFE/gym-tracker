import { addDaysISO, weekRange } from "@/lib/week";

/**
 * The weekly gate. Every Monday a gate opens with a boss and an HP bar. Every set you log that week deals
 * damage, and clearing the boss before Sunday ends earns XP and, for the hard ones, a booster. Like XP and
 * quests, a gate is worked out from the logged sets, so nothing is stored and there is nothing to claim.
 *
 * Which gate and boss appear is a fixed function of the week. How hard it is depends on how much the user
 * has trained lately, so it stays a fair fight for a beginner and for a veteran.
 */

/** Gates earn XP for weeks starting on or after this Monday. */
export const GATE_START_DATE = "2026-10-26";

export type GateLetter = "E" | "D" | "C" | "B" | "A" | "S";

export type GateRank = {
  letter: GateLetter;
  /** HP as a multiple of the user's recent weekly damage. */
  multiplier: number;
  /** XP for clearing it. */
  xp: number;
  /** Whether clearing it earns a booster. */
  booster: boolean;
};

/** Easiest first. */
export const GATE_RANKS: readonly GateRank[] = [
  { letter: "E", multiplier: 0.6, xp: 15, booster: false },
  { letter: "D", multiplier: 0.8, xp: 25, booster: false },
  { letter: "C", multiplier: 1.0, xp: 40, booster: false },
  { letter: "B", multiplier: 1.2, xp: 60, booster: false },
  { letter: "A", multiplier: 1.5, xp: 90, booster: true },
  { letter: "S", multiplier: 2.0, xp: 130, booster: true },
];

/** Said in the XP breakdown: which gates also earn a booster. */
export const boosterGatesNote = "A and S gates also earn a booster";

/** The least HP any gate has, so a brand new account still faces something real. */
export const MIN_BASE_DAMAGE = 2500;
/** How many past weeks set the difficulty. */
const HISTORY_WEEKS = 4;
/** Damage of one bodyweight rep, so a pull-up counts for something in a fight about volume. */
export const BODYWEIGHT_REP_DAMAGE = 20;

const BOSSES = [
  "Iron Golem",
  "Rep Wraith",
  "Plate Titan",
  "Barbell Hydra",
  "Lactic Drake",
  "Rust Giant",
  "Pump Phantom",
  "Deadlift Colossus",
] as const;

const DOMAINS = ["Iron", "Chalk", "Steel", "Sweat", "Thunder", "Ember", "Frost", "Stone"] as const;

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type GateInput = {
  sessions: { id: string; date: string }[];
  sets: { session_id: string; reps: number; weight_kg: number }[];
};

/** Damage of one set: its volume, or a fixed amount per rep for a bodyweight set. */
export const setDamage = (reps: number, weightKg: number): number =>
  weightKg > 0 ? reps * weightKg : reps * BODYWEIGHT_REP_DAMAGE;

/** Damage dealt on each date. */
export function dailyDamage(input: GateInput): Map<string, number> {
  const dateOf = new Map(input.sessions.map((s) => [s.id, s.date]));
  const days = new Map<string, number>();
  for (const set of input.sets) {
    const date = dateOf.get(set.session_id);
    if (!date) continue;
    days.set(date, (days.get(date) ?? 0) + setDamage(set.reps, set.weight_kg));
  }
  return days;
}

const weekTotal = (weekStart: string, days: Map<string, number>): number => {
  let total = 0;
  for (let i = 0; i < 7; i++) total += days.get(addDaysISO(weekStart, i)) ?? 0;
  return total;
};

export type Gate = {
  weekStart: string;
  weekEnd: string;
  rank: GateRank;
  /** "Gate of Iron". */
  name: string;
  boss: string;
  /** Damage needed to clear it. */
  hp: number;
};

/** The gate of the week that starts on `weekStart`, from the damage dealt before it. */
export function gateFor(weekStart: string, days: Map<string, number>): Gate {
  const previous = Array.from({ length: HISTORY_WEEKS }, (_, i) => weekTotal(addDaysISO(weekStart, -7 * (i + 1)), days));
  const trained = previous.filter((t) => t > 0);
  const average = trained.length > 0 ? trained.reduce((a, b) => a + b, 0) / trained.length : 0;
  const base = Math.max(MIN_BASE_DAMAGE, average);

  // A newcomer starts with the gentler gates, and the hard ones open up as they train.
  const reach = Math.min(GATE_RANKS.length - 1, trained.length + 1);
  const rank = GATE_RANKS[hash(`rank:${weekStart}`) % (reach + 1)];

  return {
    weekStart,
    weekEnd: addDaysISO(weekStart, 6),
    rank,
    name: `Gate of ${DOMAINS[hash(`domain:${weekStart}`) % DOMAINS.length]}`,
    boss: BOSSES[hash(`boss:${weekStart}`) % BOSSES.length],
    hp: Math.max(500, Math.round((base * rank.multiplier) / 100) * 100),
  };
}

export type GateStatus = {
  gate: Gate;
  /** Damage dealt this week so far, not capped at the HP. */
  damage: number;
  /** 0 to 1 of the HP gone. */
  progress: number;
  cleared: boolean;
  /** The day the damage first reached the HP. */
  clearedOn: string | null;
  /** The week is over and the boss still stands. */
  failed: boolean;
  /** Days left including today, 0 once the week is over. */
  daysLeft: number;
};

/** How a gate stands, counting damage up to `today`. */
export function gateStatus(gate: Gate, days: Map<string, number>, today: string): GateStatus {
  let damage = 0;
  let clearedOn: string | null = null;
  const last = today < gate.weekEnd ? today : gate.weekEnd;
  for (let d = gate.weekStart; d <= last; d = addDaysISO(d, 1)) {
    damage += days.get(d) ?? 0;
    if (clearedOn === null && damage >= gate.hp) clearedOn = d;
  }
  const over = today > gate.weekEnd;
  return {
    gate,
    damage: Math.round(damage),
    progress: Math.min(1, damage / gate.hp),
    cleared: clearedOn !== null,
    clearedOn,
    failed: over && clearedOn === null,
    daysLeft: over ? 0 : Math.round((Date.parse(gate.weekEnd) - Date.parse(today)) / 86_400_000) + 1,
  };
}

/** Every gate from the start date to today, oldest first. */
export function gatesThrough(input: GateInput, today: string, start = GATE_START_DATE): GateStatus[] {
  const days = dailyDamage(input);
  const results: GateStatus[] = [];
  for (let week = weekRange(start).start; week <= weekRange(today).start; week = addDaysISO(week, 7)) {
    if (week < start) continue;
    results.push(gateStatus(gateFor(week, days), days, today));
  }
  return results;
}

/** The gate of the current week. */
export function currentGate(input: GateInput, today: string): GateStatus {
  const days = dailyDamage(input);
  return gateStatus(gateFor(weekRange(today).start, days), days, today);
}

/** XP for each cleared gate, dated on the day it fell, so a boosted day doubles it. */
export function gateRewards(input: GateInput, today: string, start = GATE_START_DATE): { date: string; xp: number }[] {
  return gatesThrough(input, today, start)
    .filter((g) => g.cleared)
    .map((g) => ({ date: g.clearedOn!, xp: g.gate.rank.xp }));
}

/** How many cleared gates earn a booster, for the booster rules. */
export function boosterGates(input: GateInput, today: string, start = GATE_START_DATE): number {
  return gatesThrough(input, today, start).filter((g) => g.cleared && g.gate.rank.booster).length;
}
