import { unlockedBetween, type FeatureId } from "@/lib/unlocks";
import { isSilenced, MAX_MOMENTS_PER_DAY, rollDay, type Memory, type Prefs } from "./state";
import type { Moment, SeraContext } from "./types";

/** The pages where she never interrupts: a workout that is being logged. The exercise library is fine. */
export const isWorkoutScreen = (path: string): boolean => /^\/workouts\/(?!exercises)[^/]+/.test(path);

/** Come back after this many days away and she says so. */
export const COMEBACK_DAYS = 3;

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
 * Whether Sera speaks up on her own right now, and about what. At most one thing per page load and
 * {@link MAX_MOMENTS_PER_DAY} a day, each moment once (a daily one once a day), never while you log a workout,
 * never while the chat is open, and never in Quiet or Off. Returns the most important moment, or null.
 */
export function pickMoment(input: PickInput): Moment | null {
  const { ctx, path, prefs, now, today, chatOpen } = input;
  if (chatOpen || isSilenced(prefs, now.getTime()) || isWorkoutScreen(path)) return null;

  const memory = rollDay(input.memory, today);
  if (memory.shownToday >= MAX_MOMENTS_PER_DAY) return null;
  const told = (key: string) => key in memory.told;

  // A brand new account is welcomed first. An existing one gets a quiet hello, once.
  if (ctx.isNew && !told("welcome")) return { key: "welcome", node: "welcome" };
  if (!ctx.isNew && !told("intro") && !told("welcome")) return { key: "intro", node: "intro" };

  // A level up that opened something.
  if (memory.lastLevel !== null && ctx.level > memory.lastLevel) {
    const opened = unlockedBetween(memory.lastLevel, ctx.level);
    const key = `unlock:${ctx.level}`;
    if (opened.length > 0 && !told(key)) return { key, node: "unlock", args: { features: opened.map((f) => f.id) } };
  }

  if (ctx.workouts >= 1 && told("welcome") && !told("firstWorkout")) return { key: "firstWorkout", node: "firstWorkout" };

  if (ctx.chestsWaiting > 0 && !told(`chest:${today}`)) return { key: `chest:${today}`, node: "chest" };

  if (ctx.daysAway >= COMEBACK_DAYS && !told(`comeback:${today}`)) return { key: `comeback:${today}`, node: "comeback" };

  if (ctx.checkinKind === null && ctx.level < NUDGE_BELOW_LEVEL && told("welcome") && /^\/dashboard\/?$/.test(path) && !told(`nudge:${today}`)) {
    return { key: `nudge:${today}`, node: "nudge" };
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
  return { key, node: "lockedPage", args: { featureId } };
}
