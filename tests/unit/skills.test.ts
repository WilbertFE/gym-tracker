import { describe, expect, it } from "vitest";
import { buildBattle, describeTurn } from "@/lib/battle/engine";
import {
  COMBO_BONUS,
  COMBO_EVERY,
  EXECUTIONER_CRIT_MULTIPLIER,
  IRON_WILL_HEAL_FACTOR,
  KEEN_EYE_WEAK_BONUS,
  NO_SKILLS,
  RHYTHM_BONUS,
  RHYTHM_DAYS,
  skillEffects,
  SKILLS,
  unlockedSkills,
} from "@/lib/battle/skills";
import { dailyDamage, GATE_RANKS, gateFlow, gateRewards, hitFor, powerFromStats, skillsBefore, weakPointFor, weekOrder, type Gate, type GateInput } from "@/lib/gates";
import { computeStats } from "@/lib/stats";
import { computeXp } from "@/lib/xp";

const MON = "2026-11-09";
const gate = (hp: number): Gate => ({ weekStart: MON, weekEnd: "2026-11-15", rank: GATE_RANKS[0], name: "Gate of Iron", boss: "Iron Golem", hp });
const none = powerFromStats(0, 0);
const set = (session_id: string, reps: number, weight_kg: number, completed_at: string, id: string, exercise_id = "e") => ({ id, session_id, exercise_id, reps, weight_kg, completed_at });

describe("the skills", () => {
  it("unlock one after another as the level rises, the first with the gates themselves", () => {
    expect(SKILLS.map((s) => s.level)).toEqual([...SKILLS.map((s) => s.level)].sort((a, b) => a - b));
    expect(SKILLS[0].level).toBe(26);
    expect(unlockedSkills(25)).toEqual([]);
    expect(unlockedSkills(26).map((s) => s.id)).toEqual(["power-strike"]);
    expect(unlockedSkills(10_000)).toHaveLength(SKILLS.length);
    expect(new Set(SKILLS.map((s) => s.id)).size).toBe(SKILLS.length);
    for (const s of SKILLS) expect(`${s.name} ${s.blurb}`).not.toContain("—");
  });

  it("change nothing without a level, and each one changes one thing with it", () => {
    expect(skillEffects(0)).toEqual(NO_SKILLS);
    expect(skillEffects(26)).toEqual({ ...NO_SKILLS, combo: true });
    expect(skillEffects(32).healFactor).toBe(IRON_WILL_HEAL_FACTOR);
    expect(skillEffects(38).rhythm).toBe(true);
    expect(skillEffects(44).weakBonus).toBe(KEEN_EYE_WEAK_BONUS);
    expect(skillEffects(50).critMultiplier).toBe(EXECUTIONER_CRIT_MULTIPLIER);
    // They are all bounded, so even the top level stays modest.
    const top = skillEffects(10_000);
    expect(top.healFactor).toBeGreaterThan(0);
    expect(COMBO_BONUS + RHYTHM_BONUS).toBeLessThan(0.5);
  });

  it("take the level from the input of the gate, and only when it has one", () => {
    const input: GateInput = { sessions: [], sets: [], levelBefore: (week) => (week === MON ? 40 : 0) };
    expect(skillsBefore(MON, input).rhythm).toBe(true);
    expect(skillsBefore("2026-11-16", input)).toEqual(NO_SKILLS);
    expect(skillsBefore(MON, { sessions: [], sets: [] })).toEqual(NO_SKILLS);
  });
});

describe("where a set falls in its week", () => {
  it("counts sets and training days in the order they were done", () => {
    const input: GateInput = {
      sessions: [
        { id: "a", date: "2026-11-09" },
        { id: "b", date: "2026-11-11" },
        { id: "c", date: "2026-11-13" },
      ],
      sets: [
        set("c", 1, 1, "2026-11-13T09:00:00Z", "s5"),
        set("a", 1, 1, "2026-11-09T09:05:00Z", "s2"),
        set("a", 1, 1, "2026-11-09T09:00:00Z", "s1"),
        set("b", 1, 1, "2026-11-11T09:00:00Z", "s3"),
        set("b", 1, 1, "2026-11-11T09:10:00Z", "s4"),
      ],
    };
    const order = weekOrder(input);
    // Index 2 is the first set done, index 1 the second, and so on.
    expect([2, 1, 3, 4, 0].map((i) => order.get(i))).toEqual([
      { n: 1, dayN: 1 },
      { n: 2, dayN: 1 },
      { n: 3, dayN: 2 },
      { n: 4, dayN: 2 },
      { n: 5, dayN: 3 },
    ]);
  });

  it("starts again each week", () => {
    const input: GateInput = {
      sessions: [
        { id: "a", date: "2026-11-09" },
        { id: "b", date: "2026-11-16" },
      ],
      sets: [set("a", 1, 1, "x", "s1"), set("b", 1, 1, "x", "s2")],
    };
    expect(weekOrder(input).get(1)).toEqual({ n: 1, dayN: 1 });
  });
});

describe("a hit with skills", () => {
  const s = set("a", 10, 100, "t", "h1");

  it("Power Strike adds 25 percent to every fifth set, and only with the skill", () => {
    const skills = skillEffects(26);
    expect(hitFor(s, 0, MON, none, undefined, { place: { n: COMBO_EVERY, dayN: 1 }, skills })).toMatchObject({ combo: true, damage: Math.round(1000 * (1 + COMBO_BONUS)) });
    expect(hitFor(s, 0, MON, none, undefined, { place: { n: COMBO_EVERY - 1, dayN: 1 }, skills })).toMatchObject({ combo: false, damage: 1000 });
    expect(hitFor(s, 0, MON, none, undefined, { place: { n: COMBO_EVERY, dayN: 1 } })).toMatchObject({ combo: false, damage: 1000 });
  });

  it("Steady Rhythm adds 10 percent from the third training day on", () => {
    const skills = skillEffects(38);
    expect(hitFor(s, 0, MON, none, undefined, { place: { n: 1, dayN: RHYTHM_DAYS - 1 }, skills }).rhythm).toBe(false);
    expect(hitFor(s, 0, MON, none, undefined, { place: { n: 1, dayN: RHYTHM_DAYS }, skills })).toMatchObject({ rhythm: true, damage: Math.round(1000 * (1 + RHYTHM_BONUS)) });
  });

  it("Keen Eye makes a weak point hit worth 30 percent, and Executioner a critical hit worth double", () => {
    const weak = weakPointFor(MON);
    expect(hitFor(s, 0, MON, none, { e: weak }, { skills: skillEffects(44) }).damage).toBe(Math.round(1000 * (1 + KEEN_EYE_WEAK_BONUS)));
    expect(hitFor(s, 0, MON, none, { e: weak }, { skills: skillEffects(26) }).damage).toBe(1150);
    const crit = { ...none, critChance: 1 };
    expect(hitFor(s, 0, MON, crit, undefined, { skills: skillEffects(50) }).damage).toBe(1000 * EXECUTIONER_CRIT_MULTIPLIER);
    expect(hitFor(s, 0, MON, crit, undefined, { skills: skillEffects(44) }).damage).toBe(1500);
  });
});

describe("skills in a gate", () => {
  const sessions = [{ id: "a", date: "2026-11-09" }];
  const sets = Array.from({ length: 6 }, (_, i) => set("a", 10, 100, `2026-11-09T09:0${i}:00Z`, `s${i}`));

  it("add damage from the level of the week and not before, and the gate and the fight agree on it", () => {
    const plain = dailyDamage({ sessions, sets }).get(MON)!;
    expect(plain).toBe(6000);
    const withSkills = dailyDamage({ sessions, sets, levelBefore: () => 26 }).get(MON)!;
    // Only the fifth of the six sets is a Power Strike.
    expect(withSkills).toBe(6000 + Math.round(1000 * COMBO_BONUS));
    const stats = computeStats({ checkins: [], sessions: [], sets: [], questsCompleted: 0 });
    const battle = buildBattle({ gate: gate(100_000), gateInput: { sessions, sets, levelBefore: () => 26 }, names: {}, stats, today: "2026-11-15" })!;
    expect(battle.totalDamage).toBe(withSkills);
    expect(battle.turns.map((t) => t.combo)).toEqual([false, false, false, false, true, false]);
    expect(battle.skillLevel).toBe(26);
    expect(describeTurn(battle.turns[4], battle.monster)).toContain("Power Strike!");
  });

  it("make a monster recover half as much with Iron Will", () => {
    const days = new Map([["2026-11-09", 3000]]);
    const normal = gateFlow(gate(10_000), days, "2026-11-15");
    const will = gateFlow(gate(10_000), days, "2026-11-15", IRON_WILL_HEAL_FACTOR);
    expect(normal.healed).toBe(900);
    expect(will.healed).toBe(450);
  });

  it("pay the same gate XP as the gate card clears, because both use the same input", () => {
    const gateInput: GateInput = { sessions, sets, levelBefore: () => 26 };
    const today = "2026-11-15";
    const viaXp = computeXp({
      checkins: [],
      weights: [],
      photos: [],
      sessions: sessions.map((s) => ({ ...s, ended_at: null })),
      sets,
      gates: { today, input: gateInput },
      welcomeBoost: false,
    });
    const direct = gateRewards(gateInput, today);
    expect(viaXp.lines.find((l) => l.source === "gates")?.count).toBe(direct.length);
    expect(viaXp.lines.find((l) => l.source === "gates")?.xp).toBe(direct.reduce((n, r) => n + r.xp, 0));
  });
});
