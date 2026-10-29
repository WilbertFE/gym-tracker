import { describe, expect, it } from "vitest";
import { buildBattle, describeTurn } from "@/lib/battle/engine";
import { heroCombat } from "@/lib/battle/hero";
import { MONSTERS, monsterFor } from "@/lib/battle/monsters";
import {
  CRIT_MULTIPLIER,
  dailyDamage,
  GATE_RANKS,
  gateFor,
  gateStatus,
  hitFor,
  MAX_ATTACK_BONUS,
  MAX_CRIT_CHANCE,
  powerBefore,
  powerFromStats,
  seeded,
  type Gate,
  type GateInput,
} from "@/lib/gates";
import { computeStats } from "@/lib/stats";

const MON = "2026-11-09";
const SUN = "2026-11-15";

/** A rank E gate for the week of `weekStart`, with `hp` to burn through. */
const gateE = (hp: number, weekStart = MON): Gate => ({
  weekStart,
  weekEnd: SUN,
  rank: GATE_RANKS[0],
  name: "Gate of Iron",
  boss: "Iron Golem",
  hp,
});

let n = 0;
const set = (session_id: string, reps: number, weight_kg: number, completed_at: string, exercise_id = "bench") => ({
  id: `set-${++n}`,
  session_id,
  exercise_id,
  reps,
  weight_kg,
  completed_at,
});

const muscles = { bench: "chest", squat: "quads", row: "lats", curl: "biceps" };

describe("the power a week starts with", () => {
  it("is nothing for a hero who has not trained before, and capped for one who has trained a lot", () => {
    expect(powerFromStats(0, 0)).toEqual({ strength: 0, agility: 0, attack: 1, critChance: 0 });
    const top = powerFromStats(500, 500);
    expect(top.attack).toBeCloseTo(1 + MAX_ATTACK_BONUS);
    expect(top.critChance).toBe(MAX_CRIT_CHANCE);
    expect(powerFromStats(40, 40).attack).toBeCloseTo(1.1);
  });

  it("comes only from sets logged before the week, never from the week itself", () => {
    const input: GateInput = {
      sessions: [
        { id: "old", date: "2026-11-02" },
        { id: "now", date: "2026-11-10" },
        { id: "later", date: "2026-11-20" },
      ],
      sets: [set("old", 10, 100, "2026-11-02T10:00:00Z"), set("now", 10, 5000, "2026-11-10T10:00:00Z"), set("later", 10, 5000, "2026-11-20T10:00:00Z")],
      exerciseMuscles: muscles,
    };
    const power = powerBefore(MON, input);
    const alone = powerBefore(MON, { ...input, sets: [input.sets[0]] });
    expect(power).toEqual(alone);
    expect(power.strength).toBe(computeStats({ checkins: [], sessions: [], sets: [{ session_id: "old", exercise_id: "bench", reps: 10, weight_kg: 100 }], exerciseMuscles: muscles, questsCompleted: 0 })[0].value);
    // With no history before the week there is no bonus at all.
    expect(powerBefore("2026-11-02", input)).toEqual(powerFromStats(0, 0));
  });

  it("gives the first set of a week the same damage whatever else is logged that week", () => {
    const history = [{ id: "old", date: "2026-11-02" }];
    const base = [set("old", 20, 80, "2026-11-02T10:00:00Z")];
    const first = set("w1", 8, 80, "2026-11-10T10:00:00Z");
    const a: GateInput = { sessions: [...history, { id: "w1", date: "2026-11-10" }], sets: [...base, first], exerciseMuscles: muscles };
    const b: GateInput = { sessions: [...history, { id: "w1", date: "2026-11-10" }], sets: [...base, first, set("w1", 12, 120, "2026-11-10T10:05:00Z", "squat")], exerciseMuscles: muscles };
    const dmgOfFirst = (input: GateInput) => hitFor(first, 1, MON, powerBefore(MON, input)).damage;
    expect(dmgOfFirst(a)).toBe(dmgOfFirst(b));
  });
});

describe("one set's hit", () => {
  const s = set("x", 10, 50, "2026-11-10T10:00:00Z");

  it("is its volume with no power, and the same every time", () => {
    const none = powerFromStats(0, 0);
    expect(hitFor(s, 0, MON, none)).toEqual({ base: 500, crit: false, damage: 500 });
    expect(hitFor(s, 0, MON, none)).toEqual(hitFor(s, 0, MON, none));
  });

  it("counts a bodyweight rep as 20 damage when no weight is logged", () => {
    expect(hitFor({ session_id: "x", reps: 10, weight_kg: 0 }, 0, MON, powerFromStats(0, 0)).base).toBe(200);
  });

  it("adds the Strength bonus, and 1.5 times on a critical hit", () => {
    const strong = powerFromStats(100, 0);
    expect(hitFor(s, 0, MON, strong).damage).toBe(Math.round(500 * 1.25));
    const alwaysCrit = { ...powerFromStats(0, 0), critChance: 1 };
    expect(hitFor(s, 0, MON, alwaysCrit)).toMatchObject({ crit: true, damage: Math.round(500 * CRIT_MULTIPLIER) });
  });

  it("rolls a critical hit from a fixed seed, so about a quarter of hits crit at the cap and never at zero", () => {
    let crits = 0;
    const power = powerFromStats(0, 400);
    for (let i = 0; i < 2000; i++) if (hitFor({ session_id: "x", reps: 1, weight_kg: 1, id: `s${i}` }, i, MON, power).crit) crits += 1;
    expect(crits / 2000).toBeGreaterThan(0.2);
    expect(crits / 2000).toBeLessThan(0.3);
    for (let i = 0; i < 200; i++) expect(hitFor({ session_id: "x", reps: 1, weight_kg: 1, id: `s${i}` }, i, MON, powerFromStats(0, 0)).crit).toBe(false);
    expect(seeded("a")).toBe(seeded("a"));
    expect(seeded("a")).toBeGreaterThanOrEqual(0);
    expect(seeded("a")).toBeLessThan(1);
  });
});

describe("the damage of a gate", () => {
  it("never drops below the plain volume and never rises above the caps", () => {
    const sessions = [
      { id: "old", date: "2026-10-26" },
      { id: "w", date: "2026-11-10" },
    ];
    const old = Array.from({ length: 60 }, (_, i) => set("old", 10, 100, `2026-10-26T10:${String(i % 60).padStart(2, "0")}:00Z`, ["bench", "squat", "row", "curl"][i % 4]));
    const week = [set("w", 10, 100, "2026-11-10T10:00:00Z"), set("w", 10, 100, "2026-11-10T10:05:00Z", "squat")];
    const withHistory = dailyDamage({ sessions, sets: [...old, ...week], exerciseMuscles: muscles }).get("2026-11-10")!;
    const plain = dailyDamage({ sessions: [sessions[1]], sets: week, exerciseMuscles: muscles }).get("2026-11-10")!;
    expect(plain).toBe(2000);
    expect(withHistory).toBeGreaterThanOrEqual(plain);
    expect(withHistory).toBeLessThanOrEqual(plain * (1 + MAX_ATTACK_BONUS) * CRIT_MULTIPLIER + 1);
  });

  it("keeps the old result for a hero with no history: the same damage, the same clear", () => {
    const input: GateInput = { sessions: [{ id: "w", date: "2026-11-10" }], sets: [set("w", 10, 100, "2026-11-10T10:00:00Z"), set("w", 5, 60, "2026-11-10T10:05:00Z")] };
    const days = dailyDamage(input);
    expect(days.get("2026-11-10")).toBe(1300);
    const status = gateStatus(gateE(1300), days, "2026-11-12");
    expect(status.cleared).toBe(true);
    expect(status.clearedOn).toBe("2026-11-10");
    expect(gateStatus(gateE(1301), days, "2026-11-12").cleared).toBe(false);
  });

  it("guards a rank E gate with the Iron Golem, and leaves the other ranks on their listed bosses", () => {
    const days = new Map<string, number>();
    const bosses = new Set<string>();
    const letters = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const g = gateFor(`2027-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 4) * 7 + 1).padStart(2, "0")}`, days);
      letters.add(g.rank.letter);
      if (g.rank.letter === "E") expect(g.boss).toBe("Iron Golem");
      else bosses.add(g.boss);
    }
    expect(letters.has("E")).toBe(true);
    expect(bosses.has("Iron Golem")).toBe(false);
    expect(monsterFor("E")?.name).toBe("Iron Golem");
    expect(monsterFor("D")).toBeNull();
  });
});

describe("the fight", () => {
  const sessions = [
    { id: "a", date: "2026-11-09" },
    { id: "b", date: "2026-11-11" },
    { id: "out", date: "2026-11-16" },
  ];
  const names = { bench: "Bench Press", squat: "Squat" };
  const stats = computeStats({ checkins: [], sessions: [], sets: [], questsCompleted: 0 });
  const sets = [
    set("b", 5, 100, "2026-11-11T09:00:00Z", "squat"),
    set("a", 10, 60, "2026-11-09T09:05:00Z"),
    set("a", 8, 60, "2026-11-09T09:00:00Z"),
    set("out", 10, 60, "2026-11-16T09:00:00Z"),
  ];
  const gateInput: GateInput = { sessions, sets, exerciseMuscles: muscles };

  it("has no fight for a rank without a monster", () => {
    const gateD: Gate = { ...gateE(5000), rank: GATE_RANKS[1] };
    expect(buildBattle({ gate: gateD, gateInput, names, stats })).toBeNull();
  });

  it("plays the week's sets in the order they were done, and leaves out other weeks", () => {
    const battle = buildBattle({ gate: gateE(100_000), gateInput, names, stats })!;
    expect(battle.monster.id).toBe("iron-golem");
    expect(battle.turns.map((t) => [t.n, t.date, t.reps])).toEqual([
      [1, "2026-11-09", 8],
      [2, "2026-11-09", 10],
      [3, "2026-11-11", 5],
    ]);
    expect(battle.turns[0]).toMatchObject({ exercise: "Bench Press", loadKg: 60, base: 480, damage: 480 });
    expect(battle.turns[2].exercise).toBe("Squat");
  });

  it("adds up to exactly the damage the gate itself counts, so the fight and the clear never disagree", () => {
    const battle = buildBattle({ gate: gateE(100_000), gateInput, names, stats })!;
    const days = dailyDamage(gateInput);
    let week = 0;
    for (const [date, damage] of days) if (date >= MON && date <= SUN) week += damage;
    expect(battle.totalDamage).toBe(week);
    expect(battle.turns.reduce((sum, t) => sum + t.damage, 0)).toBe(week);
  });

  it("brings the monster down turn by turn, finishes it on the turn that reaches its HP, and strikes no more after that", () => {
    const battle = buildBattle({ gate: gateE(1000), gateInput, names, stats })!;
    expect(battle.turns.map((t) => t.monsterHp)).toEqual([520, 0, 0]);
    expect(battle.defeatedAt).toBe(2);
    expect(battle.turns[0].strike).not.toBeNull();
    expect(battle.turns[1].strike).toBeNull();
    expect(battle.turns[2].strike).toBeNull();
    expect(describeTurn(battle.turns[1], battle.monster)).toContain("falls");
  });

  it("leaves the monster standing when the sets are not enough", () => {
    const battle = buildBattle({ gate: gateE(50_000), gateInput, names, stats })!;
    expect(battle.defeatedAt).toBeNull();
    expect(battle.turns.at(-1)!.monsterHp).toBe(50_000 - battle.totalDamage);
  });

  it("is an empty fight for a week with no sets", () => {
    const battle = buildBattle({ gate: gateE(5000, "2026-11-23"), gateInput, names, stats })!;
    expect(battle.turns).toEqual([]);
    expect(battle.totalDamage).toBe(0);
    expect(battle.defeatedAt).toBeNull();
  });

  it("is the same fight every time it is played", () => {
    const one = buildBattle({ gate: gateE(100_000), gateInput, names, stats });
    const two = buildBattle({ gate: gateE(100_000), gateInput: { ...gateInput, sets: [...sets].reverse() }, names, stats });
    expect(two).toEqual(one);
  });

  it("can never be lost: the hero is never knocked below a tenth of her stamina, however long it goes", () => {
    const many = Array.from({ length: 200 }, (_, i) => set("a", 1, 1, `2026-11-09T${String(8 + Math.floor(i / 60)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}:00Z`));
    const battle = buildBattle({ gate: gateE(10_000_000), gateInput: { sessions, sets: many, exerciseMuscles: muscles }, names, stats })!;
    for (const turn of battle.turns) expect(turn.stamina).toBeGreaterThanOrEqual(battle.hero.staminaFloor);
    expect(battle.turns.at(-1)!.stamina).toBe(battle.hero.staminaFloor);
  });

  it("brings some stamina back when a new training day starts, and a strong Discipline blocks part of a strike", () => {
    const tough = computeStats({
      checkins: [],
      sessions: [],
      sets: [],
      questsCompleted: 5000,
    });
    const battle = buildBattle({ gate: gateE(10_000_000), gateInput, names, stats: tough })!;
    expect(battle.hero.block).toBeGreaterThan(0);
    const day2 = battle.turns.find((t) => t.date === "2026-11-11")!;
    expect(day2.restedBy).toBeGreaterThanOrEqual(0);
    const first = battle.turns[0];
    expect(first.strike!.blocked).toBeGreaterThan(0);
    expect(first.strike!.taken).toBe(first.strike!.raw - first.strike!.blocked);
  });

  it("says what happened in plain words with no em dash", () => {
    const battle = buildBattle({ gate: gateE(1000), gateInput, names, stats })!;
    for (const turn of battle.turns) {
      const line = describeTurn(turn, battle.monster);
      expect(line.length).toBeGreaterThan(10);
      expect(line).not.toContain("—");
    }
    for (const monster of MONSTERS) {
      expect(`${monster.name} ${monster.blurb} ${monster.moves.map((m) => `${m.name} ${m.line}`).join(" ")}`).not.toContain("—");
    }
  });
});

describe("the hero", () => {
  it("takes her toughness from Endurance, Vitality and Discipline, within caps", () => {
    const stats = computeStats({ checkins: [], sessions: [], sets: [], questsCompleted: 0 });
    const hero = heroCombat(stats, powerFromStats(0, 0));
    expect(hero.staminaMax).toBe(100);
    expect(hero.staminaFloor).toBe(10);
    expect(hero.block).toBe(0);
    expect(hero.regen).toBeCloseTo(0.1);
    const fit = heroCombat(
      [
        { id: "strength", name: "Strength", value: 100, raisedBy: "", detail: "" },
        { id: "endurance", name: "Endurance", value: 80, raisedBy: "", detail: "" },
        { id: "vitality", name: "Vitality", value: 300, raisedBy: "", detail: "" },
        { id: "agility", name: "Agility", value: 60, raisedBy: "", detail: "" },
        { id: "discipline", name: "Discipline", value: 500, raisedBy: "", detail: "" },
      ],
      powerFromStats(100, 60),
    );
    expect(fit.staminaMax).toBe(180);
    expect(fit.block).toBe(0.5);
    expect(fit.regen).toBeCloseTo(0.4);
  });
});
