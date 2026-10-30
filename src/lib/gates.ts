import { MONSTERS, monsterFor } from "@/lib/battle/monsters";
import { COMBO_BONUS, COMBO_EVERY, NO_SKILLS, RHYTHM_BONUS, RHYTHM_DAYS, skillEffects, type SkillEffects } from "@/lib/battle/skills";
import { computeStats } from "@/lib/stats";
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
  /** `id`, `exercise_id` and `completed_at` are only needed for the battle replay and its critical hits. */
  sets: { session_id: string; reps: number; weight_kg: number; id?: string; exercise_id?: string; completed_at?: string }[];
  /** Primary muscle of each exercise, by id. Agility counts the muscles you train, so it needs this. */
  exerciseMuscles?: Record<string, string>;
  /**
   * The level you had on the first day of a week, counting every source of XP except the gates themselves. It unlocks the
   * hero's skills. Left out, no skills are unlocked, which is the plain rules.
   */
  levelBefore?: (weekStart: string) => number;
};

/** The skills the hero has on the first day of a week. */
export const skillsBefore = (weekStart: string, input: GateInput): SkillEffects => skillEffects(input.levelBefore?.(weekStart) ?? 0);

/** Where a set falls in its week: which set it is, and which training day. */
export type SetPlace = { n: number; dayN: number };

/**
 * The place of every set in its week, by the set's index in `input.sets`. Sets are in the order they were done (date, then
 * the time they were logged, then the order given), the same order the fight is played in, so a skill that counts sets or
 * days means the same thing for the gate and for the replay.
 */
export function weekOrder(input: GateInput): Map<number, SetPlace> {
  const dateOf = new Map(input.sessions.map((s) => [s.id, s.date]));
  const byWeek = new Map<string, { index: number; date: string; at: string }[]>();
  input.sets.forEach((set, index) => {
    const date = dateOf.get(set.session_id);
    if (!date) return;
    const week = weekRange(date).start;
    const list = byWeek.get(week) ?? [];
    list.push({ index, date, at: set.completed_at ?? "" });
    byWeek.set(week, list);
  });
  const places = new Map<number, SetPlace>();
  for (const list of byWeek.values()) {
    list.sort((a, b) => a.date.localeCompare(b.date) || a.at.localeCompare(b.at) || a.index - b.index);
    let dayN = 0;
    let lastDate = "";
    list.forEach((entry, position) => {
      if (entry.date !== lastDate) {
        dayN += 1;
        lastDate = entry.date;
      }
      places.set(entry.index, { n: position + 1, dayN });
    });
  }
  return places;
}

/** Damage of one set: its volume, or a fixed amount per rep for a bodyweight set. */
export const setDamage = (reps: number, weightKg: number): number =>
  weightKg > 0 ? reps * weightKg : reps * BODYWEIGHT_REP_DAMAGE;

/** The most extra damage Strength can give, as a share (0.25 is 25 percent). */
export const MAX_ATTACK_BONUS = 0.25;
/** The best chance of a critical hit Agility can give. */
export const MAX_CRIT_CHANCE = 0.25;
/** A critical hit deals this many times the damage. */
export const CRIT_MULTIPLIER = 1.5;

/** What the hero brings into a week: the two stats that change damage, and what they turn into. */
export type Power = {
  strength: number;
  agility: number;
  /** Damage multiplier from Strength, from 1 up to 1.25. */
  attack: number;
  /** Chance of a critical hit from Agility, up to 0.25. */
  critChance: number;
};

export const powerFromStats = (strength: number, agility: number): Power => ({
  strength,
  agility,
  attack: 1 + Math.min(MAX_ATTACK_BONUS, strength / 400),
  critChance: Math.min(MAX_CRIT_CHANCE, agility / 400),
});

/**
 * The power the hero has on the first day of a week: Strength and Agility worked out from the sets logged before that
 * week only, so training this week never changes this week's bonus and a gate already cleared stays cleared. Your
 * history is your power: the more you have trained before, the harder each set hits.
 */
export function powerBefore(weekStart: string, input: GateInput): Power {
  const dateOf = new Map(input.sessions.map((s) => [s.id, s.date]));
  const before = input.sets.filter((s) => {
    const date = dateOf.get(s.session_id);
    return date !== undefined && date < weekStart;
  });
  if (before.length === 0) return powerFromStats(0, 0);
  const stats = computeStats({
    checkins: [],
    sessions: [],
    sets: before.map((s) => ({ session_id: s.session_id, exercise_id: s.exercise_id ?? s.session_id, reps: s.reps, weight_kg: s.weight_kg })),
    exerciseMuscles: input.exerciseMuscles,
    questsCompleted: 0,
  });
  const value = (id: string) => stats.find((s) => s.id === id)?.value ?? 0;
  return powerFromStats(value("strength"), value("agility"));
}

/** A number from 0 up to but not including 1, the same for the same text, so a critical hit replays the same every time. */
export const seeded = (text: string): number => hash(text) / 2 ** 32;

/** The muscles a week's monster can be weak against: the big ones, so there is always an exercise for it. */
export const WEAK_POINT_MUSCLES = ["chest", "lats", "quads", "hamstrings", "glutes", "front_delts", "side_delts", "biceps", "triceps", "abs"] as const;
/** Extra damage for a set that trains the week's weak point. */
export const WEAK_POINT_BONUS = 0.15;

/** The muscle this week's monster is weak against, the same for everyone and fixed by the week, so it nudges what you train. */
export const weakPointFor = (weekStart: string): (typeof WEAK_POINT_MUSCLES)[number] =>
  WEAK_POINT_MUSCLES[hash(`weak:${weekStart}`) % WEAK_POINT_MUSCLES.length];

export type Hit = {
  /** What the set is worth before any bonus. */
  base: number;
  crit: boolean;
  /** The set trained the week's weak point. */
  weak: boolean;
  /** Power Strike: it was the fifth set of a run. */
  combo: boolean;
  /** Steady Rhythm: it was done from the third training day of the week on. */
  rhythm: boolean;
  damage: number;
};

/**
 * One set's hit: its volume, times the Strength bonus, times 1.15 when it trains the week's weak point (`muscles` maps an
 * exercise to its primary muscle), times 1.5 on a critical hit. `index` is the set's place in the input, the seed when it has no id.
 */
export function hitFor(
  set: GateInput["sets"][number],
  index: number,
  weekStart: string,
  power: Power,
  muscles?: Record<string, string>,
  /** The set's place in its week and the skills unlocked, for the skills that count sets and days. Left out, there are none. */
  context?: { place?: SetPlace; skills?: SkillEffects },
): Hit {
  const skills = context?.skills ?? NO_SKILLS;
  const place = context?.place;
  const base = setDamage(set.reps, set.weight_kg);
  const key = set.id ?? `${set.session_id}:${index}`;
  const crit = seeded(`crit:${weekStart}:${key}`) < power.critChance;
  const weak = !!muscles && !!set.exercise_id && muscles[set.exercise_id] === weakPointFor(weekStart);
  const combo = skills.combo && !!place && place.n % COMBO_EVERY === 0;
  const rhythm = skills.rhythm && !!place && place.dayN >= RHYTHM_DAYS;
  const damage = Math.round(
    base * power.attack * (weak ? 1 + skills.weakBonus : 1) * (combo ? 1 + COMBO_BONUS : 1) * (rhythm ? 1 + RHYTHM_BONUS : 1) * (crit ? skills.critMultiplier : 1),
  );
  return { base, crit, weak, combo, rhythm, damage };
}

/**
 * The damage of one input, worked out once. Every gate, the season, the boosters, the gate XP, both fights and the friends boss all
 * start from it, and it is the heaviest loop in the game (every set of the history, with the stats before each week), so one request
 * used to run it about ten times. Keyed by the input object, so a new input always gets a fresh result and nothing needs clearing.
 */
const damageCache = new WeakMap<GateInput, Map<string, number>>();

/** Damage dealt on each date. The map is shared by everything that asks about the same input, so it must be treated as read only. */
export function dailyDamage(input: GateInput): Map<string, number> {
  const cached = damageCache.get(input);
  if (cached) return cached;
  const days = computeDailyDamage(input);
  damageCache.set(input, days);
  return days;
}

function computeDailyDamage(input: GateInput): Map<string, number> {
  const dateOf = new Map(input.sessions.map((s) => [s.id, s.date]));
  const days = new Map<string, number>();
  const powers = new Map<string, { power: Power; skills: SkillEffects }>();
  const order = weekOrder(input);
  input.sets.forEach((set, index) => {
    const date = dateOf.get(set.session_id);
    if (!date) return;
    const week = weekRange(date).start;
    let week_ = powers.get(week);
    if (!week_) {
      week_ = { power: powerBefore(week, input), skills: skillsBefore(week, input) };
      powers.set(week, week_);
    }
    days.set(date, (days.get(date) ?? 0) + hitFor(set, index, week, week_.power, input.exerciseMuscles, { place: order.get(index), skills: week_.skills }).damage);
  });
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
  /** A season boss, which lasts a whole month instead of a week. `weekStart` and `weekEnd` are then the first and last day of the month. */
  season?: boolean;
  /** The monster that guards it, when it is not the one of its rank (a season boss is a monster of any rank, awakened). */
  monsterId?: string;
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
    // Every gate rank has its own monster.
    boss: monsterFor(rank.letter)?.name ?? rank.letter,
    hp: Math.max(500, Math.round((base * rank.multiplier) / 100) * 100),
  };
}

/** Training stops for this many days in a row before the monster starts to recover. */
export const IDLE_DAYS_BEFORE_HEAL = 3;
/** What it recovers each further idle day, as a share of its HP. */
export const HEAL_SHARE_PER_DAY = 0.03;
/** The most it can recover in a week, as a share of its HP. */
export const MAX_HEAL_SHARE = 0.15;

export type GateFlow = {
  /** HP lost so far, with what it recovered taken off. */
  lost: number;
  /** HP it recovered in all. */
  healed: number;
  /** The day the damage first reached the HP. */
  clearedOn: string | null;
  /** HP recovered on each idle day that healed it. */
  heals: Map<string, number>;
};

/**
 * How a week goes, day by day: damage takes HP off the monster, and a run of idle days gives some back. After
 * {@link IDLE_DAYS_BEFORE_HEAL} days in a row with no training (days that are over, not today) it recovers
 * {@link HEAL_SHARE_PER_DAY} of its HP a day, up to {@link MAX_HEAL_SHARE} in a week, and never beyond full. A monster
 * that has fallen stays down. A normal training week with a rest day or two between sessions never gives it a thing.
 */
export function gateFlow(gate: Gate, days: Map<string, number>, today: string, healFactor = 1): GateFlow {
  let lost = 0;
  let healed = 0;
  let idle = 0;
  let clearedOn: string | null = null;
  const heals = new Map<string, number>();
  const cap = Math.round(gate.hp * MAX_HEAL_SHARE * healFactor);
  const last = today < gate.weekEnd ? today : gate.weekEnd;
  for (let d = gate.weekStart; d <= last; d = addDaysISO(d, 1)) {
    const damage = days.get(d) ?? 0;
    if (damage > 0) {
      idle = 0;
      lost += damage;
      if (clearedOn === null && lost >= gate.hp) clearedOn = d;
    } else if (d < today && clearedOn === null) {
      idle += 1;
      if (idle >= IDLE_DAYS_BEFORE_HEAL) {
        const heal = Math.min(Math.round(gate.hp * HEAL_SHARE_PER_DAY * healFactor), cap - healed, lost);
        if (heal > 0) {
          lost -= heal;
          healed += heal;
          heals.set(d, heal);
        }
      }
    }
  }
  return { lost, healed, clearedOn, heals };
}

export type GateStatus = {
  gate: Gate;
  /** Damage dealt this week so far, not capped at the HP. */
  damage: number;
  /** HP the monster recovered on idle days. */
  healed: number;
  /** HP the monster has left, after the damage and what it recovered. 0 once it has fallen. */
  hpLeft: number;
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
export function gateStatus(gate: Gate, days: Map<string, number>, today: string, healFactor = 1): GateStatus {
  const flow = gateFlow(gate, days, today, healFactor);
  let damage = 0;
  const last = today < gate.weekEnd ? today : gate.weekEnd;
  for (let d = gate.weekStart; d <= last; d = addDaysISO(d, 1)) damage += days.get(d) ?? 0;
  const over = today > gate.weekEnd;
  const hpLeft = Math.max(0, Math.round(gate.hp - flow.lost));
  return {
    gate,
    damage: Math.round(damage),
    healed: flow.healed,
    hpLeft,
    progress: Math.min(1, flow.lost / gate.hp),
    cleared: flow.clearedOn !== null,
    clearedOn: flow.clearedOn,
    failed: over && flow.clearedOn === null,
    daysLeft: over ? 0 : Math.round((Date.parse(gate.weekEnd) - Date.parse(today)) / 86_400_000) + 1,
  };
}

/** Seasons count from this month. Nothing is handed out for the months before it. */
export const SEASON_START_DATE = "2026-11-01";
/** A season boss has this many times the HP of a normal gate's base, about 80 percent of what you did in a month lately. */
export const SEASON_HP_MULTIPLIER = 3.4;
/** The least HP a season boss has. */
export const SEASON_MIN_HP = 10_000;
/** A season boss is scored as a hard gate, but its reward is a chest and no XP, so the leaderboard is not affected. */
export const SEASON_RANK: GateRank = { letter: "S", multiplier: SEASON_HP_MULTIPLIER, xp: 0, booster: false };

/** The first and last day of the month a date falls in. */
export function seasonRange(date: string): { start: string; end: string } {
  const [year, month] = date.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, "0");
  return { start: `${year}-${mm}-01`, end: `${year}-${mm}-${String(last).padStart(2, "0")}` };
}

/**
 * The boss of the season that starts on `monthStart`: a monster of the six, one for each month in turn, awakened, with HP
 * from how much you did in the weeks before the month, so it is a fair fight for a beginner and for a veteran.
 */
export function seasonFor(monthStart: string, days: Map<string, number>): Gate {
  const firstMonday = weekRange(monthStart).start;
  const previous = Array.from({ length: HISTORY_WEEKS }, (_, i) => weekTotal(addDaysISO(firstMonday, -7 * (i + 1)), days));
  const trained = previous.filter((t) => t > 0);
  const average = trained.length > 0 ? trained.reduce((a, b) => a + b, 0) / trained.length : 0;
  const base = Math.max(MIN_BASE_DAMAGE, average);
  const [year, month] = monthStart.split("-").map(Number);
  const monster = MONSTERS[(year * 12 + month) % MONSTERS.length];
  return {
    weekStart: monthStart,
    weekEnd: seasonRange(monthStart).end,
    rank: SEASON_RANK,
    name: `Season of ${DOMAINS[hash(`season:${monthStart}`) % DOMAINS.length]}`,
    boss: `Awakened ${monster.name}`,
    monsterId: monster.id,
    season: true,
    hp: Math.max(SEASON_MIN_HP, Math.round((base * SEASON_HP_MULTIPLIER) / 100) * 100),
  };
}

/** Every season from the start to this month, oldest first. */
export function seasonsThrough(input: GateInput, today: string, start = SEASON_START_DATE): GateStatus[] {
  const days = dailyDamage(input);
  const results: GateStatus[] = [];
  let month = seasonRange(start).start;
  const current = seasonRange(today).start;
  while (month <= current) {
    results.push(gateStatus(seasonFor(month, days), days, today, skillsBefore(month, input).healFactor));
    const next = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1));
    month = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-01`;
  }
  return results;
}

/** This month's season boss, or null before the seasons start. */
export function currentSeason(input: GateInput, today: string, start = SEASON_START_DATE): GateStatus | null {
  const all = seasonsThrough(input, today, start);
  return all.length > 0 ? all[all.length - 1] : null;
}

/** Every gate from the start date to today, oldest first. */
export function gatesThrough(input: GateInput, today: string, start = GATE_START_DATE): GateStatus[] {
  const days = dailyDamage(input);
  const results: GateStatus[] = [];
  for (let week = weekRange(start).start; week <= weekRange(today).start; week = addDaysISO(week, 7)) {
    if (week < start) continue;
    results.push(gateStatus(gateFor(week, days), days, today, skillsBefore(week, input).healFactor));
  }
  return results;
}

/** The gate of the current week. */
export function currentGate(input: GateInput, today: string): GateStatus {
  const days = dailyDamage(input);
  const week = weekRange(today).start;
  return gateStatus(gateFor(week, days), days, today, skillsBefore(week, input).healFactor);
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
