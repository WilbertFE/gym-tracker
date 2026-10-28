import { describe, expect, it } from "vitest";
import {
  BODYWEIGHT_REP_DAMAGE,
  boosterGates,
  currentGate,
  dailyDamage,
  gateFor,
  gateRewards,
  gateStatus,
  GATE_RANKS,
  MIN_BASE_DAMAGE,
  setDamage,
} from "@/lib/gates";
import { computeXp } from "@/lib/xp";

const MON = "2026-11-02";
const input = (rows: { date: string; reps: number; kg: number }[]) => ({
  sessions: rows.map((r, i) => ({ id: `s${i}`, date: r.date })),
  sets: rows.map((r, i) => ({ session_id: `s${i}`, reps: r.reps, weight_kg: r.kg })),
});

describe("gate damage", () => {
  it("is volume, and a fixed amount per bodyweight rep", () => {
    expect(setDamage(10, 50)).toBe(500);
    expect(setDamage(8, 0)).toBe(8 * BODYWEIGHT_REP_DAMAGE);
  });

  it("adds up by date", () => {
    const days = dailyDamage(input([{ date: MON, reps: 10, kg: 50 }, { date: MON, reps: 5, kg: 100 }]));
    expect(days.get(MON)).toBe(1000);
  });
});

describe("the gate of a week", () => {
  it("is the same every time and has a boss and a name", () => {
    const a = gateFor(MON, new Map());
    expect(gateFor(MON, new Map())).toEqual(a);
    expect(a.boss.length).toBeGreaterThan(3);
    expect(a.name).toMatch(/^Gate of /);
    expect(a.weekEnd).toBe("2026-11-08");
  });

  it("gives a newcomer only gentle gates and a sensible minimum HP", () => {
    for (let i = 0; i < 40; i++) {
      const week = new Date(Date.UTC(2026, 0, 5 + i * 7)).toISOString().slice(0, 10);
      const gate = gateFor(week, new Map());
      expect(["E", "D"]).toContain(gate.rank.letter);
      expect(gate.hp).toBeGreaterThanOrEqual(500);
      expect(gate.hp).toBeLessThanOrEqual(MIN_BASE_DAMAGE);
    }
  });

  it("scales the HP to recent training, so a veteran faces a bigger boss", () => {
    const veteran = new Map<string, number>();
    for (let w = 1; w <= 4; w++) veteran.set(new Date(Date.UTC(2026, 10, 2 - 7 * w)).toISOString().slice(0, 10), 20000);
    const gate = gateFor(MON, veteran);
    expect(gate.hp).toBeGreaterThan(gateFor(MON, new Map()).hp);
  });

  it("only ever uses the known ranks", () => {
    expect(GATE_RANKS.map((r) => r.letter)).toEqual(["E", "D", "C", "B", "A", "S"]);
  });
});

describe("gate status and rewards", () => {
  const gate = gateFor(MON, new Map());
  const hit = (date: string, damage: number) => input([{ date, reps: 1, kg: damage }]);

  it("tracks damage and days left", () => {
    const s = gateStatus(gate, dailyDamage(hit(MON, 100)), "2026-11-04");
    expect(s.damage).toBe(100);
    expect(s.cleared).toBe(false);
    expect(s.failed).toBe(false);
    expect(s.daysLeft).toBe(5);
  });

  it("clears on the day the damage reaches the HP", () => {
    const days = dailyDamage(input([{ date: MON, reps: 1, kg: gate.hp - 1 }, { date: "2026-11-03", reps: 1, kg: 5 }]));
    const s = gateStatus(gate, days, "2026-11-05");
    expect(s.cleared).toBe(true);
    expect(s.clearedOn).toBe("2026-11-03");
    expect(s.progress).toBe(1);
  });

  it("fails when the week ends with the boss standing", () => {
    const s = gateStatus(gate, dailyDamage(hit(MON, 10)), "2026-11-09");
    expect(s.failed).toBe(true);
    expect(s.daysLeft).toBe(0);
  });

  it("pays nothing before the gate is cleared, and its XP once cleared", () => {
    expect(gateRewards(hit(MON, 10), "2026-11-04", MON)).toEqual([]);
    const rewards = gateRewards(hit(MON, gate.hp), "2026-11-04", MON);
    expect(rewards).toEqual([{ date: MON, xp: gate.rank.xp }]);
  });

  it("does not count weeks before the start date", () => {
    expect(gateRewards(hit("2026-10-12", 99999), "2026-11-04", MON)).toEqual([]);
  });

  it("earns boosters only for A and S gates", () => {
    expect(boosterGates(hit(MON, gate.hp), "2026-11-04", MON)).toBe(gate.rank.booster ? 1 : 0);
    expect(GATE_RANKS.filter((r) => r.booster).map((r) => r.letter)).toEqual(["A", "S"]);
  });

  it("shows the current week's gate", () => {
    expect(currentGate(hit(MON, 10), "2026-11-04").gate.weekStart).toBe(MON);
  });
});

describe("gates in the XP total", () => {
  const base = { checkins: [], weights: [], measurements: [], photos: [], welcomeBoost: false };

  it("adds the XP of a cleared gate and doubles it on a boosted day", () => {
    const gate = gateFor(MON, new Map());
    const session = { id: "w", date: MON, ended_at: `${MON}T11:00:00.000Z` };
    const sets = [{ session_id: "w", reps: 1, weight_kg: gate.hp }, { session_id: "w", reps: 1, weight_kg: 1 }, { session_id: "w", reps: 1, weight_kg: 1 }];
    const gates = { today: "2026-11-04", start: MON };
    const a = computeXp({ ...base, sessions: [session], sets, gates });
    const line = a.lines.find((l) => l.source === "gates")!;
    expect(line).toMatchObject({ count: 1, xp: gate.rank.xp });
    const b = computeXp({ ...base, sessions: [session], sets, gates, boostedDays: [MON] });
    expect(b.lines.find((l) => l.source === "gates")!.xp).toBe(gate.rank.xp * 2);
  });

  it("is nothing unless gates are turned on", () => {
    const x = computeXp({ ...base, sessions: [], sets: [] });
    expect(x.lines.find((l) => l.source === "gates")).toMatchObject({ count: 0, xp: 0 });
  });
});
