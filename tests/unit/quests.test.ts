import { describe, expect, it } from "vitest";
import {
  buildDayMetrics,
  buildQuestBoard,
  DAILY_ANCHOR,
  DAILY_POOL,
  DAILY_SWEEP_XP,
  dailyQuestsFor,
  dailyStatus,
  metricValue,
  QUEST_START_DATE,
  questRewards,
  weeklyQuestsFor,
  weeklyStatus,
  WEEKLY_POOL,
  WEEKLY_SWEEP_XP,
  type QuestInput,
} from "@/lib/quests";
import { addDaysISO } from "@/lib/week";
import { computeXp, XP_RULES, type XpInput } from "@/lib/xp";

// Monday 2026-11-02 to Sunday 2026-11-08.
const MON = "2026-11-02";
const START = "2026-10-28";

const empty: QuestInput = { checkins: [], weights: [], sessions: [], sets: [] };
const finished = (id: string, date: string) => ({ id, date, ended_at: `${date}T11:00:00.000Z` });
const sets = (session_id: string, n: number, exercise_id = "bench") => Array.from({ length: n }, () => ({ session_id, exercise_id }));
const muscles = { bench: "chest", row: "lats", squat: "quads", curl: "biceps", press: "front_delts", calf: "calves", abs: "abs" };

describe("which quests appear", () => {
  it("is the same for the same date, every time", () => {
    expect(dailyQuestsFor("2026-11-02").map((q) => q.id)).toEqual(dailyQuestsFor("2026-11-02").map((q) => q.id));
    expect(weeklyQuestsFor(MON).map((q) => q.id)).toEqual(weeklyQuestsFor(MON).map((q) => q.id));
  });

  it("is three daily quests, always starting with the check-in", () => {
    for (let i = 0; i < 60; i++) {
      const quests = dailyQuestsFor(addDaysISO("2026-10-01", i));
      expect(quests).toHaveLength(3);
      expect(quests[0]).toEqual(DAILY_ANCHOR);
      expect(new Set(quests.map((q) => q.id)).size).toBe(3);
    }
  });

  it("never pairs two quests of one group", () => {
    for (let i = 0; i < 60; i++) {
      const date = addDaysISO("2026-10-01", i);
      const daily = dailyQuestsFor(date).filter((q) => q.group);
      expect(new Set(daily.map((q) => q.group)).size).toBe(daily.length);
      const weekly = weeklyQuestsFor(addDaysISO("2026-09-07", i * 7)).filter((q) => q.group);
      expect(new Set(weekly.map((q) => q.group)).size).toBe(weekly.length);
    }
  });

  it("is three weekly quests", () => {
    expect(weeklyQuestsFor(MON)).toHaveLength(3);
  });

  it("varies from day to day and week to week, and uses the whole pool over time", () => {
    const dailySets = new Set<string>();
    const ids = new Set<string>();
    for (let i = 0; i < 120; i++) {
      const q = dailyQuestsFor(addDaysISO("2026-10-01", i));
      dailySets.add(q.map((x) => x.id).join());
      q.forEach((x) => ids.add(x.id));
    }
    expect(dailySets.size).toBeGreaterThan(3);
    expect(ids.size).toBe(DAILY_POOL.length + 1);

    const weekly = new Set<string>();
    for (let i = 0; i < 80; i++) weeklyQuestsFor(addDaysISO("2026-01-05", i * 7)).forEach((x) => weekly.add(x.id));
    expect(weekly.size).toBe(WEEKLY_POOL.length);
  });

  it("has sensible, unique definitions with no em dash", () => {
    const all = [DAILY_ANCHOR, ...DAILY_POOL, ...WEEKLY_POOL];
    expect(new Set(all.map((q) => q.id)).size).toBe(all.length);
    for (const q of all) {
      expect(q.target).toBeGreaterThan(0);
      expect(q.xp).toBeGreaterThan(0);
      expect(`${q.title} ${q.hint}`).not.toContain("—");
    }
  });
});

describe("day metrics", () => {
  it("reads check-ins, how-you-feel and weigh-ins", () => {
    const m = buildDayMetrics({
      ...empty,
      checkins: [
        { date: MON, kind: "home", mood: 3, energy: 4, sleep_hours: 7 },
        { date: "2026-11-03", kind: "rest", mood: 3, energy: null, sleep_hours: 7 },
      ],
      weights: [{ date: MON }],
    });
    expect(m.get(MON)).toMatchObject({ checkin: 1, trained: 1, feel: 1, weighIn: 1 });
    expect(m.get("2026-11-03")).toMatchObject({ checkin: 1, trained: 0, feel: 0, weighIn: 0 });
  });

  it("counts sets by the workout's date and workouts only when finished with enough sets", () => {
    const m = buildDayMetrics({
      ...empty,
      sessions: [finished("a", MON), finished("b", MON), { id: "c", date: MON, ended_at: null }],
      sets: [...sets("a", 5), ...sets("b", 2), ...sets("c", 4)],
    });
    expect(m.get(MON)).toMatchObject({ sets: 11, workouts: 1 });
  });

  it("collects the different primary muscles, and none without exercise data", () => {
    const withMuscles = buildDayMetrics({
      ...empty,
      sessions: [finished("a", MON)],
      sets: [...sets("a", 2, "bench"), ...sets("a", 1, "row"), ...sets("a", 3, "squat")],
      exerciseMuscles: muscles,
    });
    expect(withMuscles.get(MON)!.muscles.size).toBe(3);
    const without = buildDayMetrics({ ...empty, sessions: [finished("a", MON)], sets: sets("a", 3) });
    expect(without.get(MON)!.muscles.size).toBe(0);
  });

  it("sums most metrics over days and counts different muscles for the muscle one", () => {
    const m = buildDayMetrics({
      ...empty,
      checkins: [{ date: MON, kind: "gym" }, { date: "2026-11-03", kind: "gym" }],
      sessions: [finished("a", MON), finished("b", "2026-11-03")],
      sets: [...sets("a", 3, "bench"), ...sets("b", 3, "bench"), ...sets("b", 1, "row")],
      exerciseMuscles: muscles,
    });
    const days = [m.get(MON), m.get("2026-11-03")];
    expect(metricValue("checkin", days)).toBe(2);
    expect(metricValue("sets", days)).toBe(7);
    expect(metricValue("muscles", days)).toBe(2);
    expect(metricValue("sets", [undefined])).toBe(0);
  });
});

describe("daily quests", () => {
  it("shows progress and which are done", () => {
    const input: QuestInput = { ...empty, checkins: [{ date: MON, kind: "gym" }] };
    const status = dailyStatus(MON, buildDayMetrics(input));
    expect(status).toHaveLength(3);
    expect(status[0]).toMatchObject({ done: true, value: 1, doneOn: MON });
    expect(status.slice(1).every((s) => !s.done || s.quest.metric === "checkin")).toBe(true);
  });
});

describe("weekly quests", () => {
  const train3 = WEEKLY_POOL.find((q) => q.id === "w-train3")!;
  const metricsFor = (days: string[]) =>
    buildDayMetrics({ ...empty, checkins: days.map((date) => ({ date, kind: "gym" as const })) });

  it("dates completion to the day the running total first reached the target", () => {
    // Find a week that has the train-3 quest.
    let week = MON;
    while (!weeklyQuestsFor(week).some((q) => q.id === train3.id)) week = addDaysISO(week, 7);
    const days = [week, addDaysISO(week, 1), addDaysISO(week, 3), addDaysISO(week, 5)];
    const status = weeklyStatus(week, addDaysISO(week, 6), metricsFor(days)).find((s) => s.quest.id === train3.id)!;
    expect(status.value).toBe(4);
    expect(status.done).toBe(true);
    expect(status.doneOn).toBe(addDaysISO(week, 3));
  });

  it("only counts days up to today in the current week", () => {
    let week = MON;
    while (!weeklyQuestsFor(week).some((q) => q.id === train3.id)) week = addDaysISO(week, 7);
    const days = [week, addDaysISO(week, 1), addDaysISO(week, 3)];
    const early = weeklyStatus(week, addDaysISO(week, 2), metricsFor(days)).find((s) => s.quest.id === train3.id)!;
    expect(early.done).toBe(false);
    expect(early.value).toBe(2);
  });
});

describe("quest XP", () => {
  const range = { start: START, today: "2026-11-08" };

  it("is nothing with no activity", () => {
    expect(questRewards(empty, range)).toEqual({ rewards: [], completed: 0 });
  });

  it("pays the daily check-in, dated to its day", () => {
    const { rewards, completed } = questRewards({ ...empty, checkins: [{ date: MON, kind: "rest" }] }, range);
    expect(rewards).toContainEqual({ date: MON, xp: DAILY_ANCHOR.xp, kind: "daily" });
    expect(completed).toBeGreaterThanOrEqual(1);
  });

  it("does not turn days before the start date into XP", () => {
    const { rewards } = questRewards({ ...empty, checkins: [{ date: "2026-10-20", kind: "gym" }] }, range);
    expect(rewards).toEqual([]);
  });

  it("pays the daily bonus only when every one of the day's quests is done", () => {
    // A day that gets everything: check in, feel, weigh in, workout, lots of sets and muscles.
    const day = "2026-11-03";
    const full: QuestInput = {
      checkins: [{ date: day, kind: "gym", mood: 4, energy: 4, sleep_hours: 8 }],
      weights: [{ date: day }],
      sessions: [finished("a", day)],
      sets: [
        ...sets("a", 8, "bench"), ...sets("a", 4, "row"), ...sets("a", 4, "squat"),
        ...sets("a", 4, "curl"), ...sets("a", 4, "press"),
      ],
      exerciseMuscles: muscles,
    };
    const { rewards } = questRewards(full, { start: START, today: day });
    expect(rewards.some((r) => r.kind === "daily-sweep" && r.date === day && r.xp === DAILY_SWEEP_XP)).toBe(true);

    const partial = questRewards({ ...full, weights: [], sets: [], sessions: [] }, { start: START, today: day });
    expect(partial.rewards.some((r) => r.kind === "daily-sweep")).toBe(false);
  });

  it("pays a weekly quest once, on the day it was completed, and the weekly bonus for all three", () => {
    const today = "2026-11-08";
    // Plenty of everything across the week, so every weekly quest in the pool is met.
    const days = Array.from({ length: 7 }, (_, i) => addDaysISO(MON, i));
    const everything: QuestInput = {
      checkins: days.map((date) => ({ date, kind: "gym" as const, mood: 3, energy: 3, sleep_hours: 7 })),
      weights: days.map((date) => ({ date })),
      sessions: days.map((date, i) => finished(`s${i}`, date)),
      sets: days.flatMap((_, i) => [
        ...sets(`s${i}`, 10, "bench"), ...sets(`s${i}`, 2, "row"), ...sets(`s${i}`, 2, "squat"),
        ...sets(`s${i}`, 2, "curl"), ...sets(`s${i}`, 2, "press"), ...sets(`s${i}`, 2, "calf"),
      ]),
      exerciseMuscles: muscles,
    };
    const { rewards } = questRewards(everything, { start: START, today });
    const weekly = rewards.filter((r) => r.kind === "weekly");
    expect(weekly).toHaveLength(3);
    const bonus = rewards.filter((r) => r.kind === "weekly-sweep");
    expect(bonus).toHaveLength(1);
    expect(bonus[0].xp).toBe(WEEKLY_SWEEP_XP);
    expect(bonus[0].date).toBe(weekly.map((w) => w.date).sort().at(-1));
  });

  it("is not paid twice if asked again", () => {
    const input: QuestInput = { ...empty, checkins: [{ date: MON, kind: "gym" }] };
    expect(questRewards(input, range)).toEqual(questRewards(input, range));
  });
});

describe("quests in the XP total", () => {
  const base: XpInput = { checkins: [], weights: [], photos: [], sessions: [], sets: [], welcomeBoost: false };
  const line = (xp: ReturnType<typeof computeXp>) => xp.lines.find((l) => l.source === "quests")!;

  it("leaves quests out unless asked, so the plain XP rules stay as they were", () => {
    const xp = computeXp({ ...base, checkins: [{ date: MON, kind: "gym" }] });
    expect(line(xp)).toMatchObject({ count: 0, xp: 0 });
    expect(xp.total).toBe(XP_RULES.gymCheckin);
  });

  it("adds quest XP to the total", () => {
    const plain = computeXp({ ...base, checkins: [{ date: MON, kind: "rest" }] });
    const withQuests = computeXp({
      ...base,
      checkins: [{ date: MON, kind: "rest" }],
      quests: { today: "2026-11-08", start: START },
    });
    expect(line(withQuests).xp).toBeGreaterThan(0);
    expect(withQuests.total).toBe(plain.total + line(withQuests).xp);
  });

  it("doubles quest XP on a boosted day", () => {
    const quests = { today: "2026-11-08", start: START };
    const a = computeXp({ ...base, checkins: [{ date: MON, kind: "rest" }], quests });
    const b = computeXp({ ...base, checkins: [{ date: MON, kind: "rest" }], quests, boostedDays: [MON] });
    expect(line(b).xp).toBe(line(a).xp * 2);
    expect(line(b).bonus).toBe(line(a).xp);
  });

  it("starts counting at the launch date by default", () => {
    const xp = computeXp({
      ...base,
      checkins: [{ date: "2026-10-20", kind: "gym" }],
      quests: { today: "2026-10-27" },
    });
    expect(line(xp)).toMatchObject({ count: 0, xp: 0 });
    expect(QUEST_START_DATE <= "2026-10-28").toBe(true);
  });
});

describe("the quest board", () => {
  it("shows today's and this week's quests with progress", () => {
    const board = buildQuestBoard({ ...empty, checkins: [{ date: "2026-11-04", kind: "gym" }] }, "2026-11-04");
    expect(board.daily).toHaveLength(3);
    expect(board.weekly).toHaveLength(3);
    expect(board).toMatchObject({ weekStart: MON, weekEnd: "2026-11-08", daysLeft: 5 });
    expect(board.daily[0].done).toBe(true);
    expect(board.dailySweep.done).toBe(false);
  });

  it("counts the last day of the week as one day left", () => {
    expect(buildQuestBoard(empty, "2026-11-08").daysLeft).toBe(1);
    expect(buildQuestBoard(empty, MON).daysLeft).toBe(7);
  });
});
