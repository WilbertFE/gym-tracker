import { format } from "date-fns";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BOOST_DAYS_AHEAD,
  boostersEarned,
  checkBoostDay,
  dayMultiplier,
  firstActivityDate,
  summarizeBoosts,
  welcomeWindow,
} from "@/lib/boosters";
import { resetRateLimits } from "@/lib/rate-limit";
import { resetStores } from "@/lib/repositories/memory/store";
import { computeXp, XP_RULES, type XpInput } from "@/lib/xp";

vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");

import { GET as getBoosts, POST as postBoost } from "@/app/api/boosts/route";
import { addDaysISO } from "@/lib/week";

const today = format(new Date(), "yyyy-MM-dd");
const base: XpInput = { checkins: [], weights: [], measurements: [], photos: [], sessions: [], sets: [] };
const line = (xp: ReturnType<typeof computeXp>, source: string) => xp.lines.find((l) => l.source === source)!;

describe("welcome boost window", () => {
  it("starts on the first activity and lasts 7 days, both ends included", () => {
    expect(welcomeWindow("2026-10-20")).toEqual({ start: "2026-10-20", end: "2026-10-26" });
    expect(welcomeWindow(null)).toBeNull();
  });

  it("finds the first activity among many dates", () => {
    expect(firstActivityDate(["2026-10-05", "2026-09-30", "2026-10-12"])).toBe("2026-09-30");
    expect(firstActivityDate([])).toBeNull();
  });

  it("doubles days inside the window and boosted days, and nothing else", () => {
    const w = welcomeWindow("2026-10-20");
    const boosted = new Set(["2026-11-02"]);
    expect(dayMultiplier("2026-10-20", w, boosted)).toBe(2);
    expect(dayMultiplier("2026-10-26", w, boosted)).toBe(2);
    expect(dayMultiplier("2026-10-27", w, boosted)).toBe(1);
    expect(dayMultiplier("2026-10-19", w, boosted)).toBe(1);
    expect(dayMultiplier("2026-11-02", w, boosted)).toBe(2);
    expect(dayMultiplier("2026-11-03", null, boosted)).toBe(1);
  });

  it("does not stack: a boosted day inside the window is still x2", () => {
    expect(dayMultiplier("2026-10-21", welcomeWindow("2026-10-20"), new Set(["2026-10-21"]))).toBe(2);
  });
});

describe("boosters earned", () => {
  it("is none before the first workout", () => {
    expect(boostersEarned({ workouts: 0, longestStreak: 0 }).total).toBe(0);
  });

  it("gives one for the first workout, then one per five", () => {
    expect(boostersEarned({ workouts: 1, longestStreak: 0 }).total).toBe(1);
    expect(boostersEarned({ workouts: 4, longestStreak: 0 }).total).toBe(1);
    expect(boostersEarned({ workouts: 5, longestStreak: 0 }).total).toBe(2);
    expect(boostersEarned({ workouts: 10, longestStreak: 0 }).total).toBe(3);
  });

  it("adds streak boosters at 7, 14 and 30 days", () => {
    expect(boostersEarned({ workouts: 0, longestStreak: 6 }).total).toBe(0);
    expect(boostersEarned({ workouts: 0, longestStreak: 7 }).total).toBe(1);
    expect(boostersEarned({ workouts: 0, longestStreak: 14 }).total).toBe(2);
    expect(boostersEarned({ workouts: 0, longestStreak: 30 }).total).toBe(4);
  });

  it("says what earned them", () => {
    const { sources } = boostersEarned({ workouts: 5, longestStreak: 7 });
    expect(sources.map((s) => s.label)).toEqual([
      "Your first finished workout",
      "1 x 5 finished workouts",
      "A 7 day streak",
    ]);
  });
});

describe("summarizeBoosts", () => {
  const input = { workouts: 5, longestStreak: 0, usedDays: [] as string[], firstDate: "2026-10-20", today: "2026-10-22" };

  it("subtracts used boosters and never goes below zero", () => {
    expect(summarizeBoosts(input)).toMatchObject({ earned: 2, used: 0, available: 2 });
    expect(summarizeBoosts({ ...input, usedDays: ["2026-11-01"] })).toMatchObject({ used: 1, available: 1 });
    expect(summarizeBoosts({ ...input, usedDays: ["2026-11-01", "2026-11-02", "2026-11-03"] }).available).toBe(0);
  });

  it("counts the welcome days left, today included", () => {
    expect(summarizeBoosts(input).welcome).toMatchObject({ active: true, daysLeft: 5, end: "2026-10-26" });
    expect(summarizeBoosts({ ...input, today: "2026-10-26" }).welcome).toMatchObject({ active: true, daysLeft: 1 });
    expect(summarizeBoosts({ ...input, today: "2026-10-27" }).welcome).toMatchObject({ active: false, daysLeft: 0 });
  });

  it("knows when today is doubled, by either kind", () => {
    expect(summarizeBoosts(input).activeToday).toBe(true);
    const later = { ...input, today: "2026-11-10" };
    expect(summarizeBoosts(later).activeToday).toBe(false);
    expect(summarizeBoosts({ ...later, usedDays: ["2026-11-10"] }).activeToday).toBe(true);
  });

  it("has no welcome boost before any activity", () => {
    expect(summarizeBoosts({ ...input, firstDate: null }).welcome).toBeNull();
  });
});

describe("checkBoostDay", () => {
  it("accepts today and up to a week ahead, nothing in the past", () => {
    expect(checkBoostDay("2026-10-28", "2026-10-28")).toBe("ok");
    expect(checkBoostDay(addDaysISO("2026-10-28", BOOST_DAYS_AHEAD), "2026-10-28")).toBe("ok");
    expect(checkBoostDay(addDaysISO("2026-10-28", BOOST_DAYS_AHEAD + 1), "2026-10-28")).toBe("too_far");
    expect(checkBoostDay("2026-10-27", "2026-10-28")).toBe("past");
  });
});

describe("XP with boosts", () => {
  it("doubles everything earned inside the welcome window", () => {
    const xp = computeXp({
      ...base,
      checkins: [{ date: "2026-10-20", kind: "gym" }],
      weights: [{ date: "2026-10-22" }],
    });
    expect(line(xp, "gym")).toMatchObject({ xp: XP_RULES.gymCheckin * 2, bonus: XP_RULES.gymCheckin });
    expect(line(xp, "weight")).toMatchObject({ xp: XP_RULES.weight * 2, bonus: XP_RULES.weight });
    expect(xp.total).toBe((XP_RULES.gymCheckin + XP_RULES.weight) * 2);
  });

  it("stops doubling after the window, and counts only the days inside it", () => {
    const xp = computeXp({
      ...base,
      checkins: [
        { date: "2026-10-20", kind: "gym" },
        { date: "2026-10-26", kind: "gym" },
        { date: "2026-10-27", kind: "gym" },
      ],
    });
    // The 20th and 26th are inside the window, the 27th is not.
    expect(line(xp, "gym")).toMatchObject({ count: 3, xp: 20 * 2 + 20 * 2 + 20, bonus: 40 });
  });

  it("doubles a boosted day after the window", () => {
    const xp = computeXp({
      ...base,
      checkins: [{ date: "2026-10-20", kind: "gym" }, { date: "2026-11-05", kind: "gym" }, { date: "2026-11-06", kind: "gym" }],
      boostedDays: ["2026-11-05"],
    });
    expect(line(xp, "gym").xp).toBe(40 + 40 + 20);
  });

  it("doubles a workout and its sets on the day it was done", () => {
    const sessions = [{ id: "w1", date: "2026-11-05", ended_at: "2026-11-05T11:00:00.000Z" }];
    const sets = Array.from({ length: 10 }, () => ({ session_id: "w1" }));
    const plain = computeXp({ ...base, checkins: [{ date: "2026-10-01", kind: "gym" }], sessions, sets });
    const boosted = computeXp({ ...base, checkins: [{ date: "2026-10-01", kind: "gym" }], sessions, sets, boostedDays: ["2026-11-05"] });
    expect(line(boosted, "workout").xp).toBe(line(plain, "workout").xp * 2);
    expect(line(boosted, "sets").xp).toBe(line(plain, "sets").xp * 2);
  });

  it("does not double streak bonuses", () => {
    const checkins = Array.from({ length: 3 }, (_, i) => ({ date: `2026-10-0${i + 1}`, kind: "gym" as const }));
    const xp = computeXp({ ...base, checkins, boostedDays: ["2026-10-01", "2026-10-02", "2026-10-03"] });
    expect(line(xp, "streak")).toMatchObject({ xp: 30, bonus: 0 });
  });

  it("reports what the boosters need: finished workouts, best streak, first day", () => {
    const xp = computeXp({
      ...base,
      checkins: [{ date: "2026-10-01", kind: "gym" }, { date: "2026-10-02", kind: "rest" }],
      sessions: [{ id: "w1", date: "2026-10-02", ended_at: "2026-10-02T11:00:00.000Z" }],
      sets: [{ session_id: "w1" }, { session_id: "w1" }, { session_id: "w1" }],
    });
    expect(xp).toMatchObject({ workouts: 1, longestStreak: 2, firstDate: "2026-10-01" });
  });

  it("has a first activity from any source, even one with no XP yet", () => {
    const xp = computeXp({ ...base, sessions: [{ id: "w1", date: "2026-09-15", ended_at: null }] });
    expect(xp.firstDate).toBe("2026-09-15");
    expect(xp.welcome).toEqual({ start: "2026-09-15", end: "2026-09-21" });
  });
});

describe("/api/boosts", () => {
  const post = (body: unknown) => postBoost(new Request("http://localhost/api/boosts", { method: "POST", body: JSON.stringify(body) }));

  beforeEach(() => {
    resetStores();
    resetRateLimits();
  });

  it("reports the summary, with the demo user's workouts earning boosters", async () => {
    const res = await getBoosts();
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.earned).toBeGreaterThanOrEqual(1);
    expect(data.available).toBe(data.earned);
    expect(data.used).toBe(0);
  });

  it("uses a booster on a day and shows it", async () => {
    const day = addDaysISO(today, 1);
    const res = await post({ day });
    expect(res.status).toBe(201);
    expect((await res.json()).data).toMatchObject({ day });
    const { data } = await (await getBoosts()).json();
    expect(data.usedDays).toEqual([day]);
    expect(data.available).toBe(data.earned - 1);
  });

  it("refuses the same day twice", async () => {
    await post({ day: today });
    const again = await post({ day: today });
    expect(again.status).toBe(409);
    expect((await again.json()).code).toBe("already_boosted");
  });

  it("refuses the past, too far ahead, and bad input", async () => {
    expect((await post({ day: addDaysISO(today, -1) })).status).toBe(400);
    expect((await post({ day: addDaysISO(today, BOOST_DAYS_AHEAD + 1) })).status).toBe(400);
    expect((await post({ day: "tomorrow" })).status).toBe(400);
    expect((await post({})).status).toBe(400);
  });

  it("refuses when none are left, and says why", async () => {
    const { data } = await (await getBoosts()).json();
    for (let i = 0; i < data.available; i++) {
      expect((await post({ day: addDaysISO(today, i) })).status).toBe(201);
    }
    const res = await post({ day: addDaysISO(today, data.available) });
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("no_boosters");
  });
});
