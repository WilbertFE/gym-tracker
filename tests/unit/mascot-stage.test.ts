import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderStage, STAGE_IDS } from "@/lib/mascot/beats";
import { buildContext, streakStart, type ContextInput } from "@/lib/mascot/context";
import { renderNode } from "@/lib/mascot/script";
import { DEFAULT_PREFS, emptyMemory, markTold, MAX_STAGES_PER_DAY, parseMemory, rollDay, type Memory } from "@/lib/mascot/state";
import { TOUR_IDS, TOUR_TARGETS, TOURS, tourById, tourForFeature, tourForPath, tourHref } from "@/lib/mascot/tours";
import { pickMoment, STREAK_MILESTONES } from "@/lib/mascot/triggers";
import { MOODS, POSES, type Moment, type SeraContext } from "@/lib/mascot/types";
import { RANKS, rankForLevel } from "@/lib/ranks";
import { FEATURES } from "@/lib/unlocks";
import { xpForLevel } from "@/lib/xp";

const TODAY = "2026-11-10";
const NOW = new Date("2026-11-10T09:00:00");

const input = (over: Partial<ContextInput> = {}): ContextInput => ({
  today: TODAY,
  level: 33,
  totalXp: xpForLevel(33) + 5,
  xpToNext: 40,
  nextRank: null,
  showAll: false,
  guide: [{ id: "checkin", done: true }],
  checkinKind: "gym",
  checkinDates: [TODAY],
  sessionsToday: [],
  finishedWorkouts: 40,
  chestsWaiting: 0,
  quests: { done: 3, total: 3 },
  lastActivity: TODAY,
  gate: { weekStart: "2026-11-09", name: "Gate of Iron", boss: "Stone Warden", rank: "A", xp: 90, booster: true, cleared: false },
  ...over,
});
const ctx = (over: Partial<ContextInput> = {}): SeraContext => buildContext(input(over));

const allTours = TOUR_IDS.map((id) => `tour:${id}`);
/** A memory where the given keys, today's hello and every tour offer are told, so a test sees only the moment it is about. */
const told = (over: Partial<Memory> = {}, ...keys: string[]): Memory => ({
  ...emptyMemory(TODAY),
  told: Object.fromEntries([...keys, ...allTours].map((k) => [k, TODAY])),
  ...over,
});
const pick = (c: SeraContext, memory: Memory, path = "/dashboard", prefs = DEFAULT_PREFS): Moment | null =>
  pickMoment({ ctx: c, path, memory, prefs, now: NOW, today: TODAY, chatOpen: false });

/** Seven days of check-ins ending today. */
const days = (n: number) => Array.from({ length: n }, (_, i) => new Date(Date.parse(TODAY) - i * 86_400_000).toISOString().slice(0, 10));

describe("the stages", () => {
  const contexts = [ctx(), ctx({ level: 1, totalXp: 0, finishedWorkouts: 0, checkinKind: null }), ctx({ checkinKind: null }), ctx({ sessionsToday: [{ ended: true }] }), ctx({ lastActivity: "2026-11-01" })];
  const args = { features: ["body", "quests"] as const, days: 14 };

  it("renders every stage for every kind of user with a pose, a face and short beats", () => {
    for (const id of STAGE_IDS) {
      for (const c of contexts) {
        const stage = renderStage(id, c, { features: [...args.features], days: args.days });
        expect(stage.id).toBe(id);
        expect(POSES).toContain(stage.pose);
        expect(MOODS).toContain(stage.mood);
        if (stage.endMood) expect(MOODS).toContain(stage.endMood);
        expect(stage.beats.length, id).toBeGreaterThanOrEqual(1);
        expect(stage.beats.length, id).toBeLessThanOrEqual(3);
        for (const beat of stage.beats) {
          expect(beat.length, `${id}: ${beat}`).toBeLessThanOrEqual(90);
          expect(beat.trim()).not.toBe("");
        }
        for (const fact of stage.facts) expect(fact.length, fact).toBeLessThanOrEqual(32);
        for (const reply of stage.replies) {
          expect(reply.label.length, reply.label).toBeLessThanOrEqual(32);
          expect([reply.next, reply.action, reply.href, reply.tour].filter((t) => t !== undefined).length, reply.label).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  it("closes itself only for the daily hello, and the others wait for a tap and offer a way out", () => {
    for (const id of STAGE_IDS) {
      const stage = renderStage(id, ctx(), { features: ["body"], days: 7 });
      expect(stage.auto, id).toBe(id === "daily");
      if (!stage.auto) expect(stage.replies.some((r) => r.action === "close"), id).toBe(true);
    }
  });

  it("never uses an em dash", () => {
    for (const id of STAGE_IDS) {
      for (const c of contexts) {
        const stage = renderStage(id, c, { features: ["body", "quests"], days: 30 });
        expect([stage.tag, ...stage.beats, ...stage.facts, ...stage.replies.map((r) => r.label)].join(" ")).not.toContain("—");
      }
    }
  });

  it("shows the boss, the gate and the reward when a gate is cleared, in gold", () => {
    const stage = renderStage("boss", ctx({ gate: { ...input().gate, cleared: true } }));
    expect(stage.halo).toBe("gold");
    expect(stage.beats.join(" ")).toContain("Stone Warden");
    expect(stage.beats.join(" ")).toContain("Gate of Iron");
    expect(stage.facts).toEqual(["Rank A gate", "+90 XP", "A rare chest is yours", "A booster is yours"]);
    expect(renderStage("boss", ctx({ gate: { ...input().gate, rank: "D", xp: 25, booster: false, cleared: true } })).facts).toEqual(["Rank D gate", "+25 XP", "A rare chest is yours"]);
  });

  it("says what unlocked and offers the tour of that page", () => {
    const stage = renderStage("unlock", ctx({ level: 5, totalXp: xpForLevel(5) }), { features: ["quests", "schedule"] });
    expect(stage.beats[0]).toBe("Daily and weekly quests and Schedule just opened.");
    expect(stage.replies[0]).toMatchObject({ label: "Take me there", href: "/dashboard" });
    const body = renderStage("unlock", ctx({ level: 3 }), { features: ["body"] });
    expect(body.replies[0]).toMatchObject({ label: "Show me", href: "/body", tour: "body" });
  });

  it("adapts the daily hello to the day, and offers the check-in only while it is missing", () => {
    expect(renderStage("daily", ctx({ checkinKind: null })).replies[0]?.href).toBe("/dashboard#daily-checkin");
    expect(renderStage("daily", ctx({ checkinKind: null })).beats.join(" ")).toContain("check-in");
    expect(renderStage("daily", ctx({ sessionsToday: [{ ended: true }] })).beats.join(" ")).toContain("workout is done");
    expect(renderStage("daily", ctx({ sessionsToday: [{ ended: false }] })).beats.join(" ")).toContain("in progress");
    expect(renderStage("daily", ctx({ quests: { done: 1, total: 3 } })).beats.join(" ")).toContain("2 quests");
    expect(renderStage("daily", ctx()).replies).toEqual([]);
  });

  it("falls back to the daily hello for an id that does not exist", () => {
    expect(renderStage("nope", ctx()).id).toBe("daily");
  });
});

describe("when she appears big", () => {
  it("welcomes a new account with a stage that offers the dashboard tour", () => {
    const fresh = ctx({ level: 1, totalXp: 0, finishedWorkouts: 0, checkinKind: null, checkinDates: [], lastActivity: null, quests: null });
    const moment = pick(fresh, emptyMemory(TODAY));
    expect(moment).toMatchObject({ key: "welcome", kind: "stage", node: "welcome" });
    expect(renderStage("welcome", fresh).replies[0]).toEqual({ label: "Show me around", tour: "dashboard" });
  });

  it("stands up in full for the welcome, a new rank and a 30 day streak, and only for those", () => {
    const fullOnes = STAGE_IDS.filter((id) => renderStage(id, ctx(), { features: ["body"], days: 14 }).body === "full");
    expect(fullOnes.sort()).toEqual(["rankUp", "welcome"]);
    expect(renderStage("streak", ctx(), { days: 30 }).body).toBe("full");
    expect(renderStage("streak", ctx(), { days: 14 }).body).toBe("half");
    expect(renderStage("streak", ctx(), { days: 30 }).beats.length).toBe(3);
  });

  it("celebrates a new rank once, with the unlocks it brings", () => {
    // Level 24 is Iron Rookie's neighbour: pick the first level of a later rank.
    const before = rankForLevel(24);
    const after = RANKS.find((r) => r.minLevel > 24)!;
    expect(after.id).not.toBe(before.id);
    const c = ctx({ level: after.minLevel, totalXp: xpForLevel(after.minLevel) });
    const memory = told({ lastLevel: after.minLevel - 1 }, "intro", `daily:${TODAY}`);
    expect(pick(c, memory)).toMatchObject({ key: `rank:${after.id}`, kind: "stage", node: "rankUp" });
    expect(pick(c, told({ lastLevel: after.minLevel - 1 }, "intro", `daily:${TODAY}`, `rank:${after.id}`))?.node).not.toBe("rankUp");
    // A level inside the same rank is not a rank up.
    const within = ctx({ level: after.minLevel + 1, totalXp: xpForLevel(after.minLevel + 1) });
    expect(pick(within, told({ lastLevel: after.minLevel }, "intro", `daily:${TODAY}`))?.node ?? null).not.toBe("rankUp");
    const stage = renderStage("rankUp", c, { features: ["body", "quests"] });
    expect(stage.beats[0]).toContain(after.name);
    expect(stage.facts).toContain(`Rank ${after.letter}`);
    expect(stage.facts).toContain("2 new unlocks");
    expect(stage.halo).toBe("gold");
  });

  it("celebrates a gate boss once per week", () => {
    const cleared = ctx({ gate: { ...input().gate, cleared: true } });
    const memory = told({}, "intro", `daily:${TODAY}`);
    expect(pick(cleared, memory)).toMatchObject({ key: "boss:2026-11-09", kind: "stage", node: "boss" });
    expect(pick(cleared, told({}, "intro", `daily:${TODAY}`, "boss:2026-11-09"))).toBeNull();
    // Next week's boss is a new moment.
    const next = ctx({ gate: { ...input().gate, weekStart: "2026-11-16", cleared: true } });
    expect(pick(next, told({}, "intro", `daily:${TODAY}`, "boss:2026-11-09"))?.key).toBe("boss:2026-11-16");
  });

  it("does not mention a gate while gates are locked", () => {
    expect(ctx({ level: 8, totalXp: xpForLevel(8), gate: { ...input().gate, cleared: true } }).gate).toBeNull();
  });

  it("celebrates 7, 14 and 30 day streaks, once per streak, the highest one reached", () => {
    const week = ctx({ checkinDates: days(7) });
    expect(week.streak).toBe(7);
    const base = told({}, "intro", `daily:${TODAY}`);
    const key = `streak:${streakStart(days(7), TODAY)}:7`;
    expect(pick(week, base)).toMatchObject({ key, kind: "stage", node: "streak", args: { days: 7 } });
    expect(pick(week, told({}, "intro", `daily:${TODAY}`, key))).toBeNull();
    expect(pick(ctx({ checkinDates: days(6) }), base)).toBeNull();
    // Reaching 30 with 7 and 14 never told jumps straight to 30.
    expect(pick(ctx({ checkinDates: days(31) }), base)?.args?.days).toBe(30);
    // Once 14 is told, 7 never comes back, even after the told list is pruned of other things.
    const startOfTwo = streakStart(days(15), TODAY);
    expect(pick(ctx({ checkinDates: days(15) }), told({}, "intro", `daily:${TODAY}`, `streak:${startOfTwo}:14`))).toBeNull();
    expect(STREAK_MILESTONES).toEqual([7, 14, 30]);
  });

  it("starts a streak over when it breaks, so the next 7 days are a new moment", () => {
    const first = streakStart(days(7), TODAY);
    const later = streakStart([...days(7), "2026-10-20", "2026-10-19"], TODAY);
    expect(later).toBe(first);
    expect(streakStart(["2026-11-08"], TODAY)).toBeNull();
    expect(streakStart([], TODAY)).toBeNull();
  });

  it("welcomes you back after days away as a stage", () => {
    const away = ctx({ lastActivity: "2026-11-05", checkinKind: null, checkinDates: [] });
    expect(pick(away, told({}, "intro", `daily:${TODAY}`))).toMatchObject({ key: `comeback:${TODAY}`, kind: "stage" });
    expect(renderStage("comeback", away).endMood).toBe("smug");
  });

  it("opens the day with the short hello, once, and only when nothing bigger has appeared", () => {
    const c = ctx();
    expect(pick(c, told({}, "intro"))).toMatchObject({ key: `daily:${TODAY}`, kind: "stage", node: "daily" });
    expect(pick(c, told({}, "intro", `daily:${TODAY}`))).toBeNull();
    expect(pick(c, told({ stagesToday: 1 }, "intro"))).toBeNull();
    expect(pick(c, told({}, "intro"), "/dashboard", { mode: "quiet", quietUntil: null })).toBeNull();
  });

  it("keeps the order: welcome, rank up, unlock, boss, first workout, streak, welcome back, daily", () => {
    const memory = { ...told({ lastLevel: 4 }, "welcome") };
    // Everything is due at once: it unlocks first, then the boss, and so on.
    let c = ctx({ level: 33, totalXp: xpForLevel(33), finishedWorkouts: 1, checkinDates: days(7), lastActivity: "2026-11-05", gate: { ...input().gate, cleared: true } });
    let m: Memory = { ...memory };
    const order: string[] = [];
    for (let i = 0; i < 7; i += 1) {
      const moment = pick(c, { ...m, stagesToday: 0 });
      if (!moment) break;
      order.push(moment.node);
      m = { ...m, told: { ...m.told, [moment.key]: TODAY } };
    }
    expect(order).toEqual(["rankUp", "unlock", "boss", "firstWorkout", "streak", "comeback", "daily"]);
    c = ctx();
    expect(pick(c, told({}, "welcome", "firstWorkout", `daily:${TODAY}`))).toBeNull();
  });

  it(`makes at most ${MAX_STAGES_PER_DAY} stages a day, and the daily one counts`, () => {
    let m = emptyMemory(TODAY);
    m = markTold(m, `daily:${TODAY}`, TODAY, "stage");
    m = markTold(m, "boss:2026-11-09", TODAY, "stage");
    expect(m.stagesToday).toBe(MAX_STAGES_PER_DAY);
    expect(m.shownToday).toBe(0);
    const c = ctx({ gate: { ...input().gate, cleared: true }, chestsWaiting: 1 });
    // The stage budget is spent, so the waiting chest comes as a small bubble instead.
    expect(pick(c, { ...told({}, "intro", "boss:2026-11-10"), stagesToday: MAX_STAGES_PER_DAY })).toMatchObject({ kind: "bubble", node: "chest" });
    expect(rollDay(m, "2026-11-11").stagesToday).toBe(0);
  });

  it("is silent on a workout page, with the chat open, and in Quiet or Off", () => {
    const c = ctx({ gate: { ...input().gate, cleared: true } });
    const m = told({}, "intro");
    expect(pick(c, m, "/workouts/abc-1")).toBeNull();
    expect(pick(c, m, "/dashboard", { mode: "off", quietUntil: null })).toBeNull();
    expect(pickMoment({ ctx: c, path: "/dashboard", memory: m, prefs: DEFAULT_PREFS, now: NOW, today: TODAY, chatOpen: true })).toBeNull();
  });
});

describe("tour offers", () => {
  const settled = (): Memory => ({ ...emptyMemory(TODAY), told: { intro: TODAY, [`daily:${TODAY}`]: TODAY } });

  it("offers the tour of a page once, as a small bubble", () => {
    const moment = pick(ctx(), settled(), "/schedule");
    expect(moment).toEqual({ key: "tour:schedule", kind: "tourOffer", node: "tourOffer", args: { tourId: "schedule" } });
    expect(pick(ctx(), { ...settled(), told: { ...settled().told, "tour:schedule": TODAY } }, "/schedule")).toBeNull();
  });

  it("offers nothing on a page without a tour, or for a page that is still locked", () => {
    expect(pick(ctx(), settled(), "/settings")).toBeNull();
    expect(pick(ctx({ level: 4, totalXp: xpForLevel(4) }), settled(), "/schedule")).toBeNull();
  });

  it("does not offer a tour to a brand new account before it has been welcomed", () => {
    const fresh = ctx({ level: 1, totalXp: 0, finishedWorkouts: 0, checkinKind: null, checkinDates: [], lastActivity: null, quests: null });
    expect(pick(fresh, { ...emptyMemory(TODAY), stagesToday: MAX_STAGES_PER_DAY }, "/dashboard")).toBeNull();
  });

  it("counts against the bubbles of the day", () => {
    expect(pick(ctx(), { ...settled(), shownToday: 3 }, "/schedule")).toBeNull();
  });

  it("offers the menu entry only on a page that has a tour that is open", () => {
    const labels = (c: SeraContext, path: string) => renderNode("menu", c, { path }).replies.map((r) => r.label);
    expect(labels(ctx(), "/dashboard")).toContain("Show me around this page");
    expect(labels(ctx(), "/settings")).not.toContain("Show me around this page");
    expect(labels(ctx({ level: 4, totalXp: xpForLevel(4) }), "/schedule")).not.toContain("Show me around this page");
  });
});

describe("the tours", () => {
  it("has ids that are unique, and a tour for every page that can unlock", () => {
    expect(new Set(TOUR_IDS).size).toBe(TOURS.length);
    for (const f of FEATURES.filter((f) => !["quests", "boosters", "chests", "gates", "muscleLevels", "trials", "titles"].includes(f.id))) {
      expect(tourForFeature(f.id), f.id).toBeDefined();
    }
  });

  it("gives every step a title, a short plain text, a pose and a target, with no em dash", () => {
    for (const tour of TOURS) {
      expect(tour.steps.length, tour.id).toBeGreaterThanOrEqual(2);
      expect(tour.steps.length, tour.id).toBeLessThanOrEqual(10);
      expect(new Set(tour.steps.map((s) => s.target)).size, `${tour.id} targets`).toBe(tour.steps.length);
      for (const step of tour.steps) {
        expect(step.title.length, step.title).toBeGreaterThan(0);
        expect(step.title.length, step.title).toBeLessThanOrEqual(28);
        expect(step.text.length, step.text).toBeLessThanOrEqual(130);
        expect(POSES).toContain(step.pose);
        expect(step.target).toMatch(/^[a-z-]+$/);
        expect(`${step.title} ${step.text}`).not.toContain("—");
      }
    }
  });

  it("finds the tour for a page, and the page for a tour", () => {
    expect(tourForPath("/dashboard")?.id).toBe("dashboard");
    expect(tourForPath("/dashboard/")?.id).toBe("dashboard");
    expect(tourForPath("/dashboard#daily-checkin")?.id).toBe("dashboard");
    expect(tourForPath("/workouts")?.id).toBe("workouts");
    expect(tourForPath("/workouts/abc")).toBeUndefined();
    expect(tourForPath("/u/ayu")?.id).toBe("profile");
    expect(tourForPath("/u")).toBeUndefined();
    expect(tourForPath("/settings")).toBeUndefined();
    expect(tourHref(tourById("profile")!)).toBe("/profile");
    expect(tourHref(tourById("body")!)).toBe("/body");
  });

  it("only names areas that exist: every data-tour target is in the page source", () => {
    const src = join(process.cwd(), "src");
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (entry.endsWith(".tsx")) files.push(path);
        else if (!entry.includes(".")) walk(path);
      }
    };
    walk(src);
    const text = files.map((f) => readFileSync(f, "utf8")).join("\n");
    for (const target of TOUR_TARGETS) {
      const found = new RegExp(`(data-tour|tour)=["{]\\s*"?${target}["}]`).test(text);
      expect(found, `no area marked ${target}`).toBe(true);
    }
  });
});

describe("old memory", () => {
  it("still reads what an earlier version stored, with an empty stage count", () => {
    const old = parseMemory('{"v":1,"told":{"welcome":"2026-11-01"},"day":"2026-11-10","shownToday":1,"lastLevel":4}', TODAY);
    expect(old.stagesToday).toBe(0);
    expect(old.told).toEqual({ welcome: "2026-11-01" });
  });

  it("keeps one-off keys for good and forgets old daily ones", () => {
    let m: Memory = { ...emptyMemory("2026-09-01"), told: { welcome: "2026-09-01", intro: "2026-09-01", "tour:body": "2026-09-01", "daily:2026-09-01": "2026-09-01" } };
    m = markTold(m, `daily:${TODAY}`, TODAY, "stage");
    expect(Object.keys(m.told).sort()).toEqual([`daily:${TODAY}`, "intro", "tour:body", "welcome"]);
  });
});
