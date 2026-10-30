import { describe, expect, it } from "vitest";
import { buildBattle } from "@/lib/battle/engine";
import { awakened, MONSTERS, monsterById } from "@/lib/battle/monsters";
import { currentSeason, dailyDamage, SEASON_HP_MULTIPLIER, SEASON_MIN_HP, SEASON_RANK, SEASON_START_DATE, seasonFor, seasonRange, seasonsThrough, type GateInput } from "@/lib/gates";
import { computeStats } from "@/lib/stats";

let n = 0;
const set = (session_id: string, reps: number, weight_kg: number, completed_at: string) => ({ id: `ss${++n}`, session_id, exercise_id: "bench", reps, weight_kg, completed_at });
const stats = computeStats({ checkins: [], sessions: [], sets: [], questsCompleted: 0 });

describe("the months", () => {
  it("run from the first day to the last, whatever the length", () => {
    expect(seasonRange("2026-11-17")).toEqual({ start: "2026-11-01", end: "2026-11-30" });
    expect(seasonRange("2026-12-31")).toEqual({ start: "2026-12-01", end: "2026-12-31" });
    expect(seasonRange("2028-02-10")).toEqual({ start: "2028-02-01", end: "2028-02-29" });
    expect(seasonRange("2027-02-01").end).toBe("2027-02-28");
  });
});

describe("the season boss", () => {
  it("is an awakened monster of the six, a different one each month in turn", () => {
    const names = new Set<string>();
    for (let m = 1; m <= 12; m++) {
      const season = seasonFor(`2027-${String(m).padStart(2, "0")}-01`, new Map());
      expect(season.season).toBe(true);
      expect(season.boss.startsWith("Awakened ")).toBe(true);
      expect(monsterById(season.monsterId!)).not.toBeNull();
      names.add(season.monsterId!);
    }
    expect(names.size).toBe(MONSTERS.length);
    expect(seasonFor("2026-11-01", new Map())).toMatchObject({ weekStart: "2026-11-01", weekEnd: "2026-11-30", rank: SEASON_RANK });
  });

  it("is far tougher than a gate, scaled to what you did before the month, and never below the minimum", () => {
    expect(seasonFor("2026-11-01", new Map()).hp).toBe(SEASON_MIN_HP);
    // Four earlier weeks of 10,000 damage each: the base is 10,000, times the multiplier.
    const days = new Map([
      ["2026-10-05", 10_000],
      ["2026-10-12", 10_000],
      ["2026-10-19", 10_000],
      ["2026-10-26", 10_000],
    ]);
    expect(seasonFor("2026-11-01", days).hp).toBe(Math.round((10_000 * SEASON_HP_MULTIPLIER) / 100) * 100);
  });

  it("makes the awakened version stronger, with the same art", () => {
    const base = monsterById("iron-golem")!;
    const strong = awakened(base);
    expect(strong.id).toBe(base.id);
    expect(strong.name).toBe("Awakened Iron Golem");
    for (const [i, move] of strong.moves.entries()) expect(move.power).toBeGreaterThan(base.moves[i].power);
    expect(`${strong.name} ${strong.blurb}`).not.toContain("—");
  });
});

describe("the seasons of a user", () => {
  const sessions = [
    { id: "a", date: "2026-11-03" },
    { id: "b", date: "2026-11-12" },
    { id: "c", date: "2026-11-24" },
  ];
  const sets = [set("a", 10, 100, "2026-11-03T09:00:00Z"), set("b", 10, 100, "2026-11-12T09:00:00Z"), set("c", 10, 100, "2026-11-24T09:00:00Z")];
  const input: GateInput = { sessions, sets, exerciseMuscles: { bench: "chest" } };

  it("start with November 2026 and have none before", () => {
    expect(SEASON_START_DATE).toBe("2026-11-01");
    expect(currentSeason(input, "2026-10-30")).toBeNull();
    expect(seasonsThrough(input, "2026-10-30")).toEqual([]);
    expect(seasonsThrough(input, "2027-01-15").map((s) => s.gate.weekStart)).toEqual(["2026-11-01", "2026-12-01", "2027-01-01"]);
  });

  it("add up all month: damage across several weeks, the first to the last day", () => {
    const season = currentSeason(input, "2026-11-30")!;
    const days = dailyDamage(input);
    const month = [...days].filter(([d]) => d >= "2026-11-01" && d <= "2026-11-30").reduce((sum, [, v]) => sum + v, 0);
    expect(season.damage).toBe(month);
    expect(season.cleared).toBe(false);
    expect(season.failed).toBe(false);
    expect(season.daysLeft).toBe(1);
    expect(currentSeason(input, "2026-12-02")!.gate.weekStart).toBe("2026-12-01");
  });

  it("are cleared when a month's damage reaches the HP, on the day it does", () => {
    const big: GateInput = { sessions: [{ id: "a", date: "2026-11-05" }], sets: [set("a", 100, 200, "2026-11-05T09:00:00Z")] };
    const season = currentSeason(big, "2026-11-20")!;
    expect(season.cleared).toBe(true);
    expect(season.clearedOn).toBe("2026-11-05");
    expect(season.hpLeft).toBe(0);
  });

  it("play as a fight whose turns add up to the month's damage, week by week", () => {
    const season = currentSeason(input, "2026-11-30")!;
    const battle = buildBattle({ gate: season.gate, gateInput: input, names: { bench: "Bench Press" }, stats, today: "2026-11-30" })!;
    expect(battle.monster.name).toBe(season.gate.boss);
    expect(battle.turns).toHaveLength(3);
    expect(battle.totalDamage).toBe(season.damage);
    expect(battle.turns.map((t) => t.date)).toEqual(["2026-11-03", "2026-11-12", "2026-11-24"]);
    // Each turn lies in its own week, so the weak point is rolled for that week.
    expect(battle.monsterHpMax).toBe(season.gate.hp);
  });
});
