import { dailyDamage, gateFlow, hitFor, powerBefore, seeded, weakPointFor, type Gate, type GateInput, type Power } from "@/lib/gates";
import { addDaysISO } from "@/lib/week";
import type { Stat } from "@/lib/stats";
import { heroCombat, type HeroCombat } from "./hero";
import { monsterFor, type Monster } from "./monsters";

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
  const monster = monsterFor(gate.rank.letter);
  if (!monster) return null;

  const dateOf = new Map(gateInput.sessions.map((s) => [s.id, s.date]));
  const power: Power = powerBefore(gate.weekStart, gateInput);
  const hero = heroCombat(stats, power);

  // The week's sets in the order they were done. A set without a time keeps its place in the list.
  const inWeek = gateInput.sets
    .map((set, index) => ({ set, index, date: dateOf.get(set.session_id) }))
    .filter((x): x is { set: SetRow; index: number; date: string } => x.date !== undefined && x.date >= gate.weekStart && x.date <= gate.weekEnd)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.set.completed_at ?? "").localeCompare(b.set.completed_at ?? "") || a.index - b.index);

  // The days it recovered, worked out by the gate itself, so the fight and the gate always agree.
  const flow = gateFlow(gate, dailyDamage(gateInput), today);
  const turns: Turn[] = [];
  let hp = gate.hp;
  let total = 0;
  let stamina = hero.staminaMax;
  let defeatedAt: number | null = null;
  let lastDate: string | null = null;

  for (const { set, index, date } of inWeek) {
    const hit = hitFor(set, index, gate.weekStart, power, gateInput.exerciseMuscles);
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
      damage: hit.damage,
      healed,
      monsterHp: hp,
      strike,
      stamina,
      restedBy,
    });
  }

  return { monster, weakMuscle: weakPointFor(gate.weekStart), monsterHpMax: gate.hp, hero, turns, totalDamage: total, defeatedAt };
}

/** The line a turn gets in the log, in words. */
export function describeTurn(turn: Turn, monster: Monster): string {
  const what = turn.exercise ? `${turn.exercise}, ${turn.reps} reps` : `${turn.reps} reps`;
  const rested = turn.healed > 0 ? `The ${monster.name} recovered ${turn.healed.toLocaleString("en-US")} HP while you rested. ` : "";
  const hit = `${rested}${turn.crit ? "Critical hit! " : ""}${turn.weak ? "Weak point! " : ""}${what} deal ${turn.damage.toLocaleString("en-US")} damage.`;
  const answer = turn.monsterHp === 0 ? ` The ${monster.name} falls.` : turn.strike ? ` The ${monster.name} ${turn.strike.line}${turn.strike.taken > 0 ? `, and you lose ${turn.strike.taken} stamina` : ""}.` : "";
  return hit + answer;
}
