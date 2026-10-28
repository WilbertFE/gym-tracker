import { describe, expect, it } from "vitest";
import { RANKS } from "@/lib/ranks";
import { computeStats, STAT_NAMES, totalStats, type StatId, type StatsInput } from "@/lib/stats";

const empty: StatsInput = { checkins: [], sessions: [], sets: [], questsCompleted: 0 };
const get = (input: StatsInput, id: StatId) => computeStats(input).find((s) => s.id === id)!;
const set = (reps: number, weight_kg: number, exercise_id = "bench", session_id = "w") => ({ session_id, exercise_id, reps, weight_kg });
const muscles = { bench: "chest", row: "lats", squat: "quads", curl: "biceps", press: "front_delts" };

describe("computeStats", () => {
  it("has the five stats in a fixed order, all zero for a new account", () => {
    const stats = computeStats(empty);
    expect(stats.map((s) => s.id)).toEqual(["strength", "endurance", "vitality", "agility", "discipline"]);
    expect(stats.every((s) => s.value === 0)).toBe(true);
    expect(totalStats(stats)).toBe(0);
  });

  it("names every stat and says what raises it, with no em dash", () => {
    for (const s of computeStats(empty)) {
      expect(s.name).toBe(STAT_NAMES[s.id]);
      expect(s.raisedBy.length).toBeGreaterThan(8);
      expect(`${s.name} ${s.raisedBy} ${s.detail}`).not.toContain("—");
    }
  });

  it("raises strength with weight lifted, with diminishing returns", () => {
    const small = get({ ...empty, sets: [set(10, 20)] }, "strength").value;
    const more = get({ ...empty, sets: Array.from({ length: 20 }, () => set(10, 60)) }, "strength").value;
    const huge = get({ ...empty, sets: Array.from({ length: 2000 }, () => set(10, 60)) }, "strength").value;
    expect(small).toBeGreaterThan(0);
    expect(more).toBeGreaterThan(small);
    expect(huge).toBeGreaterThan(more);
    // A hundred times the volume is far from a hundred times the stat.
    expect(huge).toBeLessThan(more * 5);
  });

  it("counts a bodyweight set for endurance but not for strength", () => {
    const input = { ...empty, sets: [set(10, 0), set(10, 0)] };
    expect(get(input, "strength").value).toBe(0);
    expect(get(input, "endurance").value).toBeGreaterThan(0);
  });

  it("raises endurance with sets and with finished workout time", () => {
    const sets = Array.from({ length: 30 }, () => set(8, 40));
    const base = get({ ...empty, sets }, "endurance").value;
    const timed = get(
      { ...empty, sets, sessions: [{ id: "w", ended_at: "2026-10-28T11:00:00.000Z", duration_minutes: 90 }] },
      "endurance",
    ).value;
    expect(timed).toBeGreaterThan(base);
    // A workout still in progress has no time yet.
    const running = get({ ...empty, sets, sessions: [{ id: "w", ended_at: null, duration_minutes: 90 }] }, "endurance").value;
    expect(running).toBe(base);
  });

  it("raises vitality with check-ins and a streak", () => {
    const apart = ["2026-10-01", "2026-10-03", "2026-10-05"].map((date) => ({ date, kind: "gym" as const }));
    const together = ["2026-10-01", "2026-10-02", "2026-10-03"].map((date) => ({ date, kind: "gym" as const }));
    expect(get({ ...empty, checkins: together }, "vitality").value).toBeGreaterThan(
      get({ ...empty, checkins: apart }, "vitality").value,
    );
    expect(get({ ...empty, checkins: apart }, "vitality").value).toBeGreaterThan(0);
  });

  it("counts a rest day for vitality but not for discipline", () => {
    const rest = [{ date: "2026-10-01", kind: "rest" as const }];
    expect(get({ ...empty, checkins: rest }, "vitality").value).toBeGreaterThan(0);
    expect(get({ ...empty, checkins: rest }, "discipline").value).toBe(0);
  });

  it("raises agility with different muscles and exercises", () => {
    const one = get({ ...empty, sets: [set(8, 40, "bench"), set(8, 40, "bench")], exerciseMuscles: muscles }, "agility").value;
    const many = get(
      {
        ...empty,
        sets: [set(8, 40, "bench"), set(8, 40, "row"), set(8, 40, "squat"), set(8, 40, "curl"), set(8, 40, "press")],
        exerciseMuscles: muscles,
      },
      "agility",
    ).value;
    expect(many).toBeGreaterThan(one);
    // Muscles weigh more than exercises: 5 muscles at 4 and 5 exercises at 1.5, rounded down.
    expect(many).toBe(27);
  });

  it("counts exercises even without muscle data", () => {
    expect(get({ ...empty, sets: [set(8, 40, "a"), set(8, 40, "b")] }, "agility").value).toBe(3);
  });

  it("raises discipline with training days and quests", () => {
    const days = ["2026-10-01", "2026-10-02"].map((date) => ({ date, kind: "home" as const }));
    const base = get({ ...empty, checkins: days }, "discipline").value;
    expect(base).toBeGreaterThan(0);
    expect(get({ ...empty, checkins: days, questsCompleted: 10 }, "discipline").value).toBeGreaterThan(base);
  });

  it("never gives a negative or fractional number, and is the same every time", () => {
    const input: StatsInput = {
      checkins: [{ date: "2026-10-01", kind: "gym" }],
      sessions: [{ id: "w", ended_at: "x", duration_minutes: 33 }],
      sets: [set(7, 33.3), set(3, 101.7, "row")],
      exerciseMuscles: muscles,
      questsCompleted: 3,
    };
    const a = computeStats(input);
    expect(computeStats(input)).toEqual(a);
    for (const s of a) {
      expect(Number.isInteger(s.value)).toBe(true);
      expect(s.value).toBeGreaterThanOrEqual(0);
    }
  });

  it("does not run off the chart for a very big history", () => {
    const sets = Array.from({ length: 5000 }, (_, i) => set(10, 100, `e${i % 40}`));
    const strong = get({ ...empty, sets }, "strength").value;
    expect(strong).toBeGreaterThan(80);
    expect(strong).toBeLessThan(200);
  });
});

describe("rank letters", () => {
  const order = ["E", "D", "C", "B", "A", "S", "SS", "SSS"];

  it("never go down the ladder, from E up to SSS", () => {
    for (let i = 1; i < RANKS.length; i++) {
      expect(order.indexOf(RANKS[i].letter)).toBeGreaterThanOrEqual(order.indexOf(RANKS[i - 1].letter));
    }
    expect(RANKS[0].letter).toBe("E");
    expect(RANKS.at(-1)!.letter).toBe("SSS");
  });

  it("use every letter at least once", () => {
    expect(new Set(RANKS.map((r) => r.letter))).toEqual(new Set(order));
  });
});
