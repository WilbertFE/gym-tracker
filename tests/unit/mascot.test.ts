import { describe, expect, it } from "vitest";
import { buildContext, currentStreak, type ContextInput } from "@/lib/mascot/context";
import { pageHelp } from "@/lib/mascot/pages";
import { NODE_IDS, renderNode } from "@/lib/mascot/script";
import { DEFAULT_PREFS, emptyMemory, endOfDay, isSilenced, markTold, MAX_MOMENTS_PER_DAY, parseMemory, rollDay, withLevel, type Memory, type Prefs } from "@/lib/mascot/state";
import { suggestNext } from "@/lib/mascot/suggest";
import { COMEBACK_DAYS, isWorkoutScreen, pickLockedPageMoment, pickMoment } from "@/lib/mascot/triggers";
import { MOODS, type SeraContext } from "@/lib/mascot/types";
import { FEATURES } from "@/lib/unlocks";
import { xpForLevel } from "@/lib/xp";

const TODAY = "2026-11-10";
const NOW = new Date("2026-11-10T09:00:00");

const input = (over: Partial<ContextInput> = {}): ContextInput => ({
  today: TODAY,
  level: 1,
  totalXp: 0,
  xpToNext: 13,
  nextRank: { name: "Iron Rookie", minLevel: 5 },
  showAll: false,
  guide: [
    { id: "checkin", done: false },
    { id: "firstSet", done: false },
    { id: "firstWorkout", done: false },
    { id: "weight", done: false },
  ],
  checkinKind: null,
  checkinDates: [],
  sessionsToday: [],
  finishedWorkouts: 0,
  chestsWaiting: 0,
  quests: null,
  lastActivity: null,
  ...over,
});

const ctx = (over: Partial<ContextInput> = {}): SeraContext => buildContext(input(over));

/** A veteran: level 16, everything open, a few workouts behind them. */
const veteran = (over: Partial<ContextInput> = {}) =>
  ctx({ level: 16, totalXp: xpForLevel(16) + 5, finishedWorkouts: 40, checkinKind: "gym", checkinDates: [TODAY], guide: input().guide.map((g) => ({ ...g, done: true })), quests: { done: 3, total: 3 }, lastActivity: TODAY, ...over });

describe("what she knows", () => {
  it("knows a brand new account: level 1, everything locked, soonest first", () => {
    const c = ctx();
    expect(c.isNew).toBe(true);
    expect(c.locked).toHaveLength(FEATURES.length);
    expect(c.locked[0]).toMatchObject({ id: "body", level: 3 });
    expect(c.locked[0].xpAway).toBe(xpForLevel(3));
    expect(c.open.body).toBe(false);
    expect(c.quests).toBeNull();
  });

  it("opens things with the level, and keeps the quests out of sight while they are locked", () => {
    const c = ctx({ level: 5, totalXp: xpForLevel(5), quests: { done: 1, total: 3 }, finishedWorkouts: 2 });
    expect(c.open.body).toBe(true);
    expect(c.open.status).toBe(false);
    expect(c.quests).toEqual({ done: 1, total: 3 });
    expect(c.locked.map((f) => f.id)).not.toContain("quests");
    expect(ctx({ level: 3, quests: { done: 1, total: 3 } }).quests).toBeNull();
  });

  it("has nothing locked, and is never new, with show all on", () => {
    const c = ctx({ showAll: true });
    expect(c.locked).toEqual([]);
    expect(c.isNew).toBe(false);
    expect(Object.values(c.open).every(Boolean)).toBe(true);
  });

  it("works out the next rank and how far away it is", () => {
    expect(ctx({ totalXp: 10 }).nextRank).toEqual({ name: "Iron Rookie", level: 5, xpAway: xpForLevel(5) - 10 });
    expect(ctx({ nextRank: null }).nextRank).toBeNull();
  });

  it("counts the streak, forgiving a day that is not over yet", () => {
    expect(currentStreak([], TODAY)).toBe(0);
    expect(currentStreak(["2026-11-10", "2026-11-09", "2026-11-08"], TODAY)).toBe(3);
    expect(currentStreak(["2026-11-09", "2026-11-08"], TODAY)).toBe(2);
    expect(currentStreak(["2026-11-08"], TODAY)).toBe(0);
    expect(currentStreak(["2026-11-10", "2026-11-08"], TODAY)).toBe(1);
  });

  it("counts the days away", () => {
    expect(ctx({ lastActivity: TODAY }).daysAway).toBe(0);
    expect(ctx({ lastActivity: "2026-11-05" }).daysAway).toBe(5);
    expect(ctx({ lastActivity: null }).daysAway).toBe(0);
  });

  it("holds only counts, flags and feature names, never anything private", () => {
    const json = JSON.stringify(veteran());
    for (const field of ["weight", "weight_kg", "photo", "latitude", "longitude", "email", "gym_name", "mood", "energy", "sleep", "notes"]) {
      expect(json, field).not.toContain(`"${field}"`);
    }
  });
});

describe("what to do next", () => {
  it("goes in the order of a day", () => {
    expect(suggestNext(ctx()).action?.href).toBe("/dashboard#daily-checkin");
    expect(suggestNext(ctx({ checkinKind: "gym" })).action?.href).toBe("/workouts");
    expect(suggestNext(ctx({ checkinKind: "gym", sessionsToday: [{ ended: false }] })).lines.join(" ")).toContain("still open");
    expect(suggestNext(ctx({ level: 5, checkinKind: "home", sessionsToday: [{ ended: true }], quests: { done: 1, total: 3 } })).lines.join(" ")).toContain("2 of today's 3 quests");
  });

  it("lets a rest day be a rest day, and does not push a workout", () => {
    const rest = suggestNext(ctx({ checkinKind: "rest" }));
    expect(rest.action?.href).not.toBe("/workouts");
  });

  it("points at a waiting chest, then the weight step, then the next unlock", () => {
    const base = { level: 5, totalXp: xpForLevel(5), checkinKind: "gym" as const, sessionsToday: [{ ended: true }], quests: { done: 3, total: 3 } };
    expect(suggestNext(ctx({ ...base, chestsWaiting: 1 })).lines.join(" ")).toContain("chest");
    expect(suggestNext(ctx(base)).action?.href).toBe("/body");
    const withWeight = { ...base, guide: input().guide.map((g) => ({ ...g, done: true })) };
    const last = suggestNext(ctx(withWeight));
    expect(last.action).toBeNull();
    expect(last.lines.join(" ")).toContain("Next unlock");
  });

  it("never points at something that is still locked", () => {
    // A level 1 account has done everything it can, and Body is locked, so the weight step is not offered.
    const s = suggestNext(ctx({ checkinKind: "gym", sessionsToday: [{ ended: true }] }));
    expect(s.action?.href).not.toBe("/body");
    expect(s.lines.join(" ")).toContain("Body");
  });

  it("says everything is open when it is", () => {
    const done = suggestNext(veteran({ showAll: true, sessionsToday: [{ ended: true }] }));
    expect(done.lines.join(" ")).toContain("Everything is open");
  });
});

describe("the script", () => {
  const contexts: [string, SeraContext][] = [
    ["a new user", ctx()],
    ["a user at level 5", ctx({ level: 5, totalXp: xpForLevel(5), checkinKind: "gym", quests: { done: 0, total: 3 } })],
    ["a veteran", veteran()],
    ["show all", ctx({ showAll: true })],
  ];
  const argsFor = (id: string) =>
    id === "unlock" ? { features: ["body" as const, "quests" as const] } : id === "lockedPage" ? { featureId: "body" as const } : id === "page" ? { path: "/dashboard" } : {};

  it("has every node render for every kind of user", () => {
    for (const id of NODE_IDS) {
      for (const [who, c] of contexts) {
        const node = renderNode(id, c, argsFor(id));
        expect(node.id, `${id} for ${who}`).toBe(id);
        expect(node.lines.length, `${id} for ${who}`).toBeGreaterThan(0);
        expect(MOODS, `${id} mood`).toContain(node.mood);
      }
    }
  });

  it("keeps every line short enough for a bubble, and every reply short enough for a button", () => {
    for (const id of NODE_IDS) {
      for (const [, c] of contexts) {
        const node = renderNode(id, c, argsFor(id));
        for (const line of node.lines) {
          expect(line.length, `${id}: ${line}`).toBeLessThanOrEqual(150);
          expect(line.trim(), id).not.toBe("");
        }
        for (const reply of node.replies) expect(reply.label.length, `${id}: ${reply.label}`).toBeLessThanOrEqual(32);
        expect(node.replies.length, id).toBeLessThanOrEqual(7);
      }
    }
  });

  it("points every reply at a node that exists, or at an action, or at a page", () => {
    for (const id of NODE_IDS) {
      for (const [, c] of contexts) {
        for (const reply of renderNode(id, c, argsFor(id)).replies) {
          const targets = [reply.next, reply.action, reply.href].filter((t) => t !== undefined);
          expect(targets.length, `${id}: ${reply.label}`).toBe(1);
          if (reply.next) expect(NODE_IDS, `${id} -> ${reply.next}`).toContain(reply.next);
          if (reply.href) expect(reply.href).toMatch(/^\//);
        }
      }
    }
  });

  it("can be reached: every node is the target of another, or is a moment she speaks up with", () => {
    const moments = new Set(["welcome", "intro", "unlock", "lockedPage", "firstWorkout", "chest", "comeback", "nudge", "menu", "quietDone", "offDone", "allOpen"]);
    const reached = new Set<string>(moments);
    for (const id of NODE_IDS) for (const [, c] of contexts) for (const r of renderNode(id, c, argsFor(id)).replies) if (r.next) reached.add(r.next);
    for (const id of NODE_IDS) expect(reached.has(id), id).toBe(true);
  });

  it("never uses an em dash", () => {
    for (const id of NODE_IDS) for (const [, c] of contexts) {
      const node = renderNode(id, c, argsFor(id));
      expect([...node.lines, ...node.replies.map((r) => r.label)].join(" ")).not.toContain("—");
    }
  });

  it("falls back to the menu for an id that does not exist, so she is never silent", () => {
    expect(renderNode("nope", ctx()).id).toBe("menu");
  });

  it("offers to show everything only while something is locked", () => {
    const labels = (c: SeraContext) => renderNode("menu", c).replies.map((r) => r.label);
    expect(labels(ctx())).toContain("Show me everything now");
    expect(labels(ctx({ showAll: true }))).not.toContain("Show me everything now");
  });

  it("explains a locked page with its level and distance, and a feature that is not locked gently", () => {
    const text = renderNode("lockedPage", ctx(), { featureId: "body" }).lines.join(" ");
    expect(text).toContain("Body is locked");
    expect(text).toContain("level 3");
    expect(renderNode("lockedPage", veteran(), { featureId: "body" }).lines.join(" ")).toContain("not open yet");
  });

  it("says what opened, and links to the first thing", () => {
    const node = renderNode("unlock", ctx({ level: 5 }), { features: ["quests", "schedule"] });
    expect(node.lines[0]).toBe("Daily and weekly quests and Schedule just opened.");
    expect(node.replies[0].href).toBe("/dashboard");
  });

  it("has a line for every page of the app", () => {
    for (const path of ["/dashboard", "/workouts", "/workouts/abc", "/workouts/exercises", "/body", "/schedule", "/status", "/leaderboard", "/collection", "/profile", "/u/ayu", "/membership", "/settings", "/guide", "/dashboard/level", "/body/progress"]) {
      expect(pageHelp(path), path).not.toBeNull();
    }
    expect(pageHelp("/nowhere")).toBeNull();
    expect(pageHelp("/workouts/exercises")?.name).toBe("the exercise library");
  });
});

describe("what she remembers", () => {
  it("starts empty, and reads stored text, and forgives bad text", () => {
    expect(parseMemory(null, TODAY)).toEqual(emptyMemory(TODAY));
    expect(parseMemory("not json", TODAY)).toEqual(emptyMemory(TODAY));
    expect(parseMemory('{"v":2}', TODAY)).toEqual(emptyMemory(TODAY));
    expect(parseMemory('{"v":1,"told":{"welcome":"2026-11-01"},"day":"2026-11-01","shownToday":2,"lastLevel":4}', TODAY)).toEqual({
      v: 1,
      told: { welcome: "2026-11-01" },
      day: "2026-11-01",
      shownToday: 2,
      lastLevel: 4,
    });
    expect(parseMemory('{"v":1,"told":{"a":5,"b":"2026-11-01"},"day":3,"shownToday":"x","lastLevel":null}', TODAY).told).toEqual({ b: "2026-11-01" });
  });

  it("counts what she said today, and starts over on a new day", () => {
    let m = emptyMemory(TODAY);
    m = markTold(m, "welcome", TODAY);
    m = markTold(m, "intro", TODAY);
    expect(m.shownToday).toBe(2);
    expect(rollDay(m, "2026-11-11").shownToday).toBe(0);
    expect(rollDay(m, TODAY)).toBe(m);
  });

  it("forgets what is more than two weeks old, so a daily moment can come back", () => {
    let m: Memory = { ...emptyMemory("2026-10-01"), told: { "chest:2026-10-01": "2026-10-01", welcome: "2026-11-05" } };
    m = markTold(m, "chest:2026-11-10", TODAY);
    expect(Object.keys(m.told).sort()).toEqual(["chest:2026-11-10", "welcome"]);
  });

  it("notes the level without counting it", () => {
    const m = withLevel(emptyMemory(TODAY), 7);
    expect(m.lastLevel).toBe(7);
    expect(m.shownToday).toBe(0);
    expect(withLevel(m, 7)).toBe(m);
  });

  it("is silent in quiet and off, and until the end of the day when asked", () => {
    expect(isSilenced(DEFAULT_PREFS, NOW.getTime())).toBe(false);
    expect(isSilenced({ mode: "quiet", quietUntil: null }, NOW.getTime())).toBe(true);
    expect(isSilenced({ mode: "off", quietUntil: null }, NOW.getTime())).toBe(true);
    const until = endOfDay(NOW);
    expect(isSilenced({ mode: "normal", quietUntil: until }, NOW.getTime())).toBe(true);
    expect(isSilenced({ mode: "normal", quietUntil: until }, until + 1)).toBe(false);
  });
});

describe("when she speaks up", () => {
  const pick = (over: { ctx?: SeraContext; path?: string; memory?: Memory; prefs?: Prefs; chatOpen?: boolean } = {}) =>
    pickMoment({ ctx: over.ctx ?? ctx(), path: over.path ?? "/dashboard", memory: over.memory ?? emptyMemory(TODAY), prefs: over.prefs ?? DEFAULT_PREFS, now: NOW, today: TODAY, chatOpen: over.chatOpen ?? false });
  const told = (...keys: string[]): Memory => ({ ...emptyMemory(TODAY), told: Object.fromEntries(keys.map((k) => [k, TODAY])) });

  it("welcomes a brand new account, once", () => {
    expect(pick()).toMatchObject({ key: "welcome", node: "welcome" });
    expect(pick({ memory: told("welcome") })?.node).not.toBe("welcome");
  });

  it("says a quiet hello to someone who already uses the app, and does not run the tour", () => {
    expect(pick({ ctx: veteran() })).toMatchObject({ key: "intro", node: "intro" });
    expect(pick({ ctx: veteran(), memory: told("intro") })).toBeNull();
    // Someone who was welcomed and has grown past the start never gets the hello on top.
    expect(pick({ ctx: veteran(), memory: told("welcome") })?.node).not.toBe("intro");
  });

  it("announces what a level up opened, once", () => {
    const memory = { ...told("welcome"), lastLevel: 4 };
    const moment = pick({ ctx: ctx({ level: 5, totalXp: xpForLevel(5), checkinKind: "gym", finishedWorkouts: 1 }), memory });
    expect(moment).toMatchObject({ key: "unlock:5", node: "unlock" });
    expect(moment?.args?.features).toEqual(["quests", "boosters", "chests", "schedule"]);
    expect(pick({ ctx: ctx({ level: 5, totalXp: xpForLevel(5), checkinKind: "gym", finishedWorkouts: 1 }), memory: { ...memory, told: { ...memory.told, "unlock:5": TODAY } } })?.node).not.toBe("unlock");
  });

  it("stays quiet about a level up that opened nothing, and on the very first look", () => {
    const memory = { ...told("welcome"), lastLevel: 5 };
    expect(pick({ ctx: ctx({ level: 6, totalXp: xpForLevel(6), checkinKind: "gym", finishedWorkouts: 0 }), memory })).toBeNull();
    const first = pick({ ctx: ctx({ level: 5, totalXp: xpForLevel(5), checkinKind: "gym", finishedWorkouts: 1 }), memory: { ...told("welcome"), lastLevel: null } });
    expect(first?.node).not.toBe("unlock");
  });

  it("congratulates the first finished workout, but only someone she welcomed", () => {
    const c = ctx({ finishedWorkouts: 1, level: 4, checkinKind: "gym" });
    expect(pick({ ctx: c, memory: told("welcome") })).toMatchObject({ key: "firstWorkout" });
    expect(pick({ ctx: veteran(), memory: told("intro") })).toBeNull();
  });

  it("tells you about a waiting chest, once a day", () => {
    const c = veteran({ chestsWaiting: 2 });
    expect(pick({ ctx: c, memory: told("intro") })).toMatchObject({ key: `chest:${TODAY}`, node: "chest" });
    expect(pick({ ctx: c, memory: told("intro", `chest:${TODAY}`) })).toBeNull();
  });

  it(`welcomes you back after ${COMEBACK_DAYS} days away, not before`, () => {
    expect(pick({ ctx: veteran({ lastActivity: "2026-11-05" }), memory: told("intro") })).toMatchObject({ node: "comeback" });
    expect(pick({ ctx: veteran({ lastActivity: "2026-11-08" }), memory: told("intro") })).toBeNull();
  });

  it("nudges a newer user towards the check-in on the dashboard, and nobody else", () => {
    const newer = ctx({ level: 4, totalXp: xpForLevel(4), finishedWorkouts: 1 });
    expect(pick({ ctx: newer, memory: told("welcome", "firstWorkout") })).toMatchObject({ node: "nudge" });
    expect(pick({ ctx: newer, memory: told("welcome", "firstWorkout"), path: "/body" })).toBeNull();
    expect(pick({ ctx: veteran({ checkinKind: null }), memory: told("intro") })).toBeNull();
  });

  it("keeps quiet while a workout is being logged, but not in the exercise library", () => {
    expect(isWorkoutScreen("/workouts/abc-123")).toBe(true);
    expect(isWorkoutScreen("/workouts")).toBe(false);
    expect(isWorkoutScreen("/workouts/exercises")).toBe(false);
    expect(pick({ path: "/workouts/abc-123" })).toBeNull();
    expect(pick({ path: "/workouts/exercises" })).not.toBeNull();
  });

  it("keeps quiet while the chat is open, and in quiet, off and quiet-for-today", () => {
    expect(pick({ chatOpen: true })).toBeNull();
    expect(pick({ prefs: { mode: "quiet", quietUntil: null } })).toBeNull();
    expect(pick({ prefs: { mode: "off", quietUntil: null } })).toBeNull();
    expect(pick({ prefs: { mode: "normal", quietUntil: endOfDay(NOW) } })).toBeNull();
  });

  it(`never says more than ${MAX_MOMENTS_PER_DAY} things on her own in a day`, () => {
    const memory: Memory = { ...emptyMemory(TODAY), shownToday: MAX_MOMENTS_PER_DAY };
    expect(pick({ memory })).toBeNull();
    // The next day it starts over.
    expect(pickMoment({ ctx: ctx(), path: "/dashboard", memory, prefs: DEFAULT_PREFS, now: new Date("2026-11-11T09:00:00"), today: "2026-11-11", chatOpen: false })).not.toBeNull();
  });

  it("explains a locked page once per feature, and respects quiet and off", () => {
    const base = { ctx: ctx(), path: "/body", memory: emptyMemory(TODAY), prefs: DEFAULT_PREFS, now: NOW, today: TODAY, chatOpen: false };
    expect(pickLockedPageMoment(base, "body")).toMatchObject({ key: "locked:body", node: "lockedPage", args: { featureId: "body" } });
    expect(pickLockedPageMoment({ ...base, memory: told("locked:body") }, "body")).toBeNull();
    expect(pickLockedPageMoment({ ...base, prefs: { mode: "off", quietUntil: null } }, "body")).toBeNull();
    expect(pickLockedPageMoment({ ...base, chatOpen: true }, "body")).toBeNull();
  });
});
