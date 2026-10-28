import { differenceInCalendarDays, parseISO } from "date-fns";
import { addDaysISO } from "@/lib/week";

/**
 * XP boosters. Two kinds, both doubling the XP of the days they cover:
 *
 * - The welcome boost: automatic, for the first 7 days after your first logged activity, so a new
 *   account levels up fast while the habit is forming.
 * - Double XP Day boosters: earned by training, kept until you choose a day to use one on.
 *
 * Boosts do not stack: a day is either doubled or not. Like XP itself, what you have earned is worked
 * out from your data, and only the boosters you have used are stored.
 */
export const BOOST_MULTIPLIER = 2;
export const WELCOME_BOOST_DAYS = 7;
/** A booster can be used on today or up to this many days ahead. */
export const BOOST_DAYS_AHEAD = 7;

export const BOOSTER_RULES = {
  /** For your first finished workout. */
  firstWorkout: 1,
  /** And one more for every this many finished workouts. */
  perWorkouts: 5,
  /** For reaching a streak of this many days, [days, boosters]. */
  streaks: [
    [7, 1],
    [14, 1],
    [30, 2],
  ] as const,
} as const;

/** The earliest of some dates, or null for none. */
export function firstActivityDate(dates: string[]): string | null {
  let first: string | null = null;
  for (const d of dates) if (first === null || d < first) first = d;
  return first;
}

/** The welcome boost's first and last day (both included), or null before any activity. */
export function welcomeWindow(firstDate: string | null): { start: string; end: string } | null {
  return firstDate ? { start: firstDate, end: addDaysISO(firstDate, WELCOME_BOOST_DAYS - 1) } : null;
}

/** 2 for a boosted day, otherwise 1. */
export function dayMultiplier(
  day: string,
  window: { start: string; end: string } | null,
  boostedDays: ReadonlySet<string>,
): number {
  const welcome = window !== null && day >= window.start && day <= window.end;
  return welcome || boostedDays.has(day) ? BOOST_MULTIPLIER : 1;
}

export type BoosterEarning = { label: string; count: number };

/** How many Double XP Day boosters the activity so far has earned, and from what. */
export function boostersEarned(input: { workouts: number; longestStreak: number }): {
  total: number;
  sources: BoosterEarning[];
} {
  const sources: BoosterEarning[] = [];
  if (input.workouts >= 1) sources.push({ label: "Your first finished workout", count: BOOSTER_RULES.firstWorkout });
  const byWorkouts = Math.floor(input.workouts / BOOSTER_RULES.perWorkouts);
  if (byWorkouts > 0) {
    sources.push({ label: `${byWorkouts} x ${BOOSTER_RULES.perWorkouts} finished workouts`, count: byWorkouts });
  }
  for (const [days, count] of BOOSTER_RULES.streaks) {
    if (input.longestStreak >= days) sources.push({ label: `A ${days} day streak`, count });
  }
  return { total: sources.reduce((sum, s) => sum + s.count, 0), sources };
}

export type BoostSummary = {
  earned: number;
  used: number;
  available: number;
  /** What earned them, for the explanation. */
  sources: BoosterEarning[];
  /** Days with a Double XP Day booster used, oldest first. */
  usedDays: string[];
  welcome: { start: string; end: string; active: boolean; daysLeft: number } | null;
  /** Today's XP is doubled, by either kind. */
  activeToday: boolean;
};

export function summarizeBoosts(input: {
  workouts: number;
  longestStreak: number;
  usedDays: string[];
  firstDate: string | null;
  today: string;
}): BoostSummary {
  const { total, sources } = boostersEarned(input);
  const window = welcomeWindow(input.firstDate);
  const active = window !== null && input.today >= window.start && input.today <= window.end;
  const usedDays = [...input.usedDays].sort();

  return {
    earned: total,
    used: usedDays.length,
    available: Math.max(0, total - usedDays.length),
    sources,
    usedDays,
    welcome: window && {
      ...window,
      active,
      daysLeft: active ? differenceInCalendarDays(parseISO(window.end), parseISO(input.today)) + 1 : 0,
    },
    activeToday: active || usedDays.includes(input.today),
  };
}

/** Whether a day can take a booster: today or up to a week ahead, never the past. */
export function checkBoostDay(day: string, today: string): "ok" | "past" | "too_far" {
  if (day < today) return "past";
  if (day > addDaysISO(today, BOOST_DAYS_AHEAD)) return "too_far";
  return "ok";
}
