import { rankForLevel } from "@/lib/ranks";
import { unlockedBetween, type FeatureId } from "@/lib/unlocks";
import { isSilenced, MAX_MOMENTS_PER_DAY, MAX_STAGES_PER_DAY, rollDay, type Memory, type Prefs } from "./state";
import { tourForPath } from "./tours";
import type { Moment, SeraContext } from "./types";

/** The pages where she never interrupts: a workout that is being logged. The exercise library is fine. */
export const isWorkoutScreen = (path: string): boolean => /^\/workouts\/(?!exercises)[^/]+/.test(path);

/** Come back after this many days away and she says so. */
export const COMEBACK_DAYS = 3;

/** Streaks she celebrates, in days. */
export const STREAK_MILESTONES: readonly number[] = [7, 14, 30];

/** Under this level a missing check-in earns a gentle nudge, so veterans are never nagged. */
const NUDGE_BELOW_LEVEL = 8;

export type PickInput = {
  ctx: SeraContext;
  path: string;
  memory: Memory;
  prefs: Prefs;
  now: Date;
  /** The day in the app's calendar, `YYYY-MM-DD`. */
  today: string;
  chatOpen: boolean;
};

/**
 * Whether Sera speaks up on her own right now, and about what. At most one thing per page load, each moment once
 * (a daily one once a day), never while you log a workout, never while the chat is open, and never in Quiet or Off.
 *
 * Big appearances (stages) come first, most important first: the welcome, a new rank, something unlocked, a gate boss defeated,
 * the first workout, a streak milestone, coming back after days away, and last the short daily hello. At most
 * {@link MAX_STAGES_PER_DAY} stages a day, and the daily hello only when nothing else has appeared that day. Small
 * things (the quiet hello for veterans, a waiting chest, a check-in nudge, an offer of a tour) are speech bubbles,
 * at most {@link MAX_MOMENTS_PER_DAY} a day.
 */
export function pickMoment(input: PickInput): Moment | null {
  const { ctx, path, prefs, now, today, chatOpen } = input;
  if (chatOpen || isSilenced(prefs, now.getTime()) || isWorkoutScreen(path)) return null;

  const memory = rollDay(input.memory, today);
  const told = (key: string) => key in memory.told;
  const stage = (key: string, node: string, args?: Moment["args"]): Moment => ({ key, kind: "stage", node, args });
  const bubble = (key: string, node: string, args?: Moment["args"]): Moment => ({ key, kind: "bubble", node, args });

  if (memory.stagesToday < MAX_STAGES_PER_DAY) {
    // A brand new account is welcomed first.
    if (ctx.isNew && !told("welcome")) return stage("welcome", "welcome");

    // An existing account gets one quiet hello, as a bubble, instead of a big appearance.
    if (!ctx.isNew && !told("intro") && !told("welcome") && memory.shownToday < MAX_MOMENTS_PER_DAY) return bubble("intro", "intro");

    // A level up that crossed into a new rank (she stands up in full, and mentions what it opened), or that opened something.
    if (memory.lastLevel !== null && ctx.level > memory.lastLevel) {
      const opened = unlockedBetween(memory.lastLevel, ctx.level);
      const rank = rankForLevel(ctx.level);
      if (rank.id !== rankForLevel(memory.lastLevel).id && !told(`rank:${rank.id}`)) {
        return stage(`rank:${rank.id}`, "rankUp", { features: opened.map((f) => f.id) });
      }
      const key = `unlock:${ctx.level}`;
      if (opened.length > 0 && !told(key)) return stage(key, "unlock", { features: opened.map((f) => f.id) });
    }

    // This week's boss is down.
    if (ctx.gate?.cleared && !told(`boss:${ctx.gate.weekStart}`)) return stage(`boss:${ctx.gate.weekStart}`, "boss");

    if (ctx.workouts >= 1 && told("welcome") && !told("firstWorkout")) return stage("firstWorkout", "firstWorkout");

    // The highest streak milestone reached, once per streak. A lower one is skipped once a higher one has been told.
    const reached = STREAK_MILESTONES.filter((m) => ctx.streak >= m).at(-1);
    if (reached && ctx.streakStart) {
      const keyOf = (m: number) => `streak:${ctx.streakStart}:${m}`;
      if (!STREAK_MILESTONES.some((m) => m >= reached && told(keyOf(m)))) return stage(keyOf(reached), "streak", { days: reached });
    }

    if (ctx.daysAway >= COMEBACK_DAYS && !told(`comeback:${today}`)) return stage(`comeback:${today}`, "comeback");

    // The short daily hello, only when nothing bigger has appeared today.
    if (memory.stagesToday === 0 && !told(`daily:${today}`)) return stage(`daily:${today}`, "daily");
  }

  if (memory.shownToday >= MAX_MOMENTS_PER_DAY) return null;

  if (ctx.chestsWaiting > 0 && !told(`chest:${today}`)) return bubble(`chest:${today}`, "chest");

  if (ctx.checkinKind === null && ctx.level < NUDGE_BELOW_LEVEL && told("welcome") && /^\/dashboard\/?$/.test(path) && !told(`nudge:${today}`)) {
    return bubble(`nudge:${today}`, "nudge");
  }

  // A page with a tour you have not been offered yet.
  const tour = tourForPath(path);
  if (tour && (tour.feature === null || ctx.open[tour.feature]) && !told(`tour:${tour.id}`) && (told("welcome") || told("intro") || !ctx.isNew)) {
    return { key: `tour:${tour.id}`, kind: "tourOffer", node: "tourOffer", args: { tourId: tour.id } };
  }

  return null;
}

/** The moment for opening a locked page, from the cue the page sends. Once per feature, and respects quiet and off. */
export function pickLockedPageMoment(input: PickInput, featureId: FeatureId): Moment | null {
  const { prefs, now, today, chatOpen } = input;
  if (chatOpen || isSilenced(prefs, now.getTime())) return null;
  const memory = rollDay(input.memory, today);
  const key = `locked:${featureId}`;
  if (key in memory.told) return null;
  return { key, kind: "bubble", node: "lockedPage", args: { featureId } };
}
