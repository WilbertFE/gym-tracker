import { dailyDamage, gateFlow, hitFor, powerBefore, seeded, skillsBefore, weakPointFor, weekOrder, type Gate, type GateInput, type Power } from "@/lib/gates";
import type { SkillEffects } from "./skills";
import { addDaysISO } from "@/lib/week";
import type { Stat } from "@/lib/stats";
import { heroCombat, type HeroCombat } from "./hero";
import { awakened, monsterById, monsterFor, type Monster } from "./monsters";
import { weekRange } from "@/lib/week";

/**
 * The gate as a turn based fight, played from the sets you logged. One turn is one set, in the order you did them: you
 * hit, and between your sets the monster strikes. Nothing is stored. The fight is worked out from the sets every time and
 * is the same every time (a critical hit is rolled from a fixed seed), so it can be replayed, and it can never be lost:
 * a gate is cleared when the damage reaches the monster's HP before Sunday ends, exactly as before. The monster's
 * strikes only cost stamina, and the hero is never knocked below a tenth of it.
 */

export type Strike = {
  move: string;
  line: string;
  /** What the strike would take. */
  raw: number;
  /** What the hero's Discipline stopped. */
  blocked: number;
  /** What it took. */
  taken: number;
};

export type Turn = {
  /** 1 for the first set of the week. */
  n: number;
  setId: string;
  date: string;
  /** When the set was logged, or null when that is not known. */
  at: string | null;
  exercise: string | null;
  reps: number;
  /** Kilograms per rep, with a bodyweight exercise's share of the body weight in it. */
  loadKg: number;
  /** What the set is worth before any bonus. */
  base: number;
  crit: boolean;
  /** The set trained the week's weak point, for extra damage. */
  weak: boolean;
  /** Power Strike: this was the fifth set of a run, for extra damage. */
  combo: boolean;
  /** Steady Rhythm: this set came from the third training day of the week on, for extra damage. */
  rhythm: boolean;
  damage: number;
  /** HP the monster recovered since your last turn, on idle days. */
  healed: number;
  /** The monster's HP left after this hit, 0 once it has fallen. */
  monsterHp: number;
  /** The monster's answer, or null when this hit finished it. */
  strike: Strike | null;
  /** The hero's stamina after the exchange. */
  stamina: number;
  /** A new training day started with this turn, and her stamina came back a little. */
  restedBy: number;
};

export type Battle = {
  monster: Monster;
  /** The muscle the monster is weak against this week. */
  weakMuscle: string;
  /** What the hero's unlocked skills change this week. */
  skills: SkillEffects;
  /** The level that unlocked them: the level on the first day of the week, without the gates' XP. */
  skillLevel: number;
  monsterHpMax: number;
  hero: HeroCombat;
  turns: Turn[];
  /** The damage of every turn added up. */
  totalDamage: number;
  /** The turn that finished the monster, or null while it stands. */
  defeatedAt: number | null;
};

type SetRow = GateInput["sets"][number];

export function buildBattle(input: {
  gate: Gate;
  gateInput: GateInput;
  /** Exercise names by id, for the log. */
  names: Record<string, string>;
  /** The hero's five stats now. */
  stats: readonly Stat[];
  /** Today, so idle days that are over can heal the monster the way the gate counts them. */
  today: string;
}): Battle | null {
  const { gate, gateInput, names, stats, today } = input;
  // A season boss is one of the six monsters, awakened. Any other gate is guarded by the monster of its rank.
  const base = gate.monsterId ? monsterById(gate.monsterId) : monsterFor(gate.rank.letter);
  if (!base) return null;
  const monster = gate.season ? awakened(base) : base;

  const dateOf = new Map(gateInput.sessions.map((s) => [s.id, s.date]));
  // A week's power, skills and weak point come from that week, so a month-long season is played week by week, the way the
  // gate counts it. The hero card shows the latest week of the fight.
  const cache = new Map<string, { power: Power; skills: SkillEffects }>();
  const weekPower = (week: string) => {
    let entry = cache.get(week);
    if (!entry) {
      entry = { power: powerBefore(week, gateInput), skills: skillsBefore(week, gateInput) };
      cache.set(week, entry);
    }
    return entry;
  };
  const showWeek = weekRange(today < gate.weekEnd ? (today > gate.weekStart ? today : gate.weekStart) : gate.weekEnd).start;
  const { power, skills } = weekPower(showWeek);
  const flowSkills = skillsBefore(gate.weekStart, gateInput);
  const order = weekOrder(gateInput);
  const hero = heroCombat(stats, power);

  // The week's sets in the order they were done. A set without a time keeps its place in the list.
  const inWeek = gateInput.sets
    .map((set, index) => ({ set, index, date: dateOf.get(set.session_id) }))
    .filter((x): x is { set: SetRow; index: number; date: string } => x.date !== undefined && x.date >= gate.weekStart && x.date <= gate.weekEnd)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.set.completed_at ?? "").localeCompare(b.set.completed_at ?? "") || a.index - b.index);

  // The days it recovered, worked out by the gate itself, so the fight and the gate always agree.
  const flow = gateFlow(gate, dailyDamage(gateInput), today, flowSkills.healFactor);
  const turns: Turn[] = [];
  let hp = gate.hp;
  let total = 0;
  let stamina = hero.staminaMax;
  let defeatedAt: number | null = null;
  let lastDate: string | null = null;

  for (const { set, index, date } of inWeek) {
    const setWeek = weekRange(date).start;
    const weekly = weekPower(setWeek);
    const hit = hitFor(set, index, setWeek, weekly.power, gateInput.exerciseMuscles, { place: order.get(index), skills: weekly.skills });
    total += hit.damage;

    // A new training day brings some stamina back.
    let restedBy = 0;
    if (lastDate !== null && date !== lastDate) {
      const back = Math.min(hero.staminaMax - stamina, Math.round(hero.staminaMax * hero.regen));
      stamina += back;
      restedBy = back;
    }
    // What the monster recovered on the idle days since the last turn.
    let healed = 0;
    if (lastDate !== null && date !== lastDate && hp > 0) {
      for (let d = addDaysISO(lastDate, 1); d < date; d = addDaysISO(d, 1)) healed += flow.heals.get(d) ?? 0;
      hp = Math.min(gate.hp, hp + healed);
    }
    lastDate = date;

    const wasStanding = hp > 0;
    hp = Math.max(0, hp - hit.damage);
    if (wasStanding && hp === 0) defeatedAt = turns.length + 1;

    // The monster answers every hit but the one that finishes it, and none after it has fallen.
    const key = set.id ?? `${set.session_id}:${index}`;
    let strike: Strike | null = null;
    if (hp > 0) {
      const move = monster.moves[Math.floor(seeded(`strike:${gate.weekStart}:${key}`) * monster.moves.length)];
      const raw = Math.round(hero.staminaMax * move.power);
      const blocked = Math.round(raw * hero.block);
      const taken = Math.min(raw - blocked, Math.max(0, stamina - hero.staminaFloor));
      stamina -= taken;
      strike = { move: move.name, line: move.line, raw, blocked, taken };
    }

    turns.push({
      n: turns.length + 1,
      setId: key,
      date,
      at: set.completed_at ?? null,
      exercise: set.exercise_id ? (names[set.exercise_id] ?? null) : null,
      reps: set.reps,
      loadKg: set.reps > 0 ? Math.round((hit.base / set.reps) * 10) / 10 : 0,
      base: hit.base,
      crit: hit.crit,
      weak: hit.weak,
      combo: hit.combo,
      rhythm: hit.rhythm,
      damage: hit.damage,
      healed,
      monsterHp: hp,
      strike,
      stamina,
      restedBy,
    });
  }

  return { monster, weakMuscle: weakPointFor(showWeek), skills, skillLevel: gateInput.levelBefore?.(showWeek) ?? 0, monsterHpMax: gate.hp, hero, turns, totalDamage: total, defeatedAt };
}

/** The line a turn gets in the log, in words. */
export function describeTurn(turn: Turn, monster: Monster): string {
  const what = turn.exercise ? `${turn.exercise}, ${turn.reps} reps` : `${turn.reps} reps`;
  const rested = turn.healed > 0 ? `The ${monster.name} recovered ${turn.healed.toLocaleString("en-US")} HP while you rested. ` : "";
  const hit = `${rested}${turn.crit ? "Critical hit! " : ""}${turn.weak ? "Weak point! " : ""}${turn.combo ? "Power Strike! " : ""}${turn.rhythm ? "Steady Rhythm. " : ""}${what} deal ${turn.damage.toLocaleString("en-US")} damage.`;
  const answer = turn.monsterHp === 0 ? ` The ${monster.name} falls.` : turn.strike ? ` The ${monster.name} ${turn.strike.line}${turn.strike.taken > 0 ? `, and you lose ${turn.strike.taken} stamina` : ""}.` : "";
  return hit + answer;
}
