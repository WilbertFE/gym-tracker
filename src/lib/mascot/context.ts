import { addDaysISO } from "@/lib/week";
import { FEATURES, isUnlocked, type FeatureId } from "@/lib/unlocks";
import { xpForLevel } from "@/lib/xp";
import type { SeraContext } from "./types";

/** What the server hands over to build the context. Plain numbers, flags and dates. */
export type ContextInput = {
  today: string;
  level: number;
  totalXp: number;
  xpToNext: number;
  nextRank: { name: string; minLevel: number } | null;
  showAll: boolean;
  guide: { id: string; done: boolean }[];
  checkinKind: "gym" | "home" | "rest" | null;
  /** The days with a check-in. */
  checkinDates: string[];
  sessionsToday: { ended: boolean }[];
  finishedWorkouts: number;
  chestsWaiting: number;
  quests: { done: number; total: number } | null;
  /** The last day with any check-in, workout or log, or null. */
  lastActivity: string | null;
  /** This week's gate, as the gates module works it out. */
  gate: { weekStart: string; name: string; boss: string; rank: string; xp: number; booster: boolean; cleared: boolean };
};

/** Days in a row with a check-in. Today not being checked in yet does not break a streak that reached yesterday. */
export function currentStreak(dates: readonly string[], today: string): number {
  const days = new Set(dates);
  let day = days.has(today) ? today : addDaysISO(today, -1);
  let streak = 0;
  while (days.has(day)) {
    streak += 1;
    day = addDaysISO(day, -1);
  }
  return streak;
}

/** The first day of the current streak, or null when there is none. Used to tell one streak from the next. */
export function streakStart(dates: readonly string[], today: string): string | null {
  const length = currentStreak(dates, today);
  if (length === 0) return null;
  const last = new Set(dates).has(today) ? today : addDaysISO(today, -1);
  return addDaysISO(last, -(length - 1));
}

const daysBetween = (from: string, to: string) => Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000));

export function buildContext(input: ContextInput): SeraContext {
  const open = Object.fromEntries(FEATURES.map((f) => [f.id, isUnlocked(f.id, input.level, input.showAll)])) as Record<FeatureId, boolean>;
  const guide = (id: string) => input.guide.find((g) => g.id === id)?.done ?? false;

  return {
    level: input.level,
    totalXp: input.totalXp,
    xpToNext: input.xpToNext,
    nextRank: input.nextRank
      ? { name: input.nextRank.name, level: input.nextRank.minLevel, xpAway: Math.max(0, xpForLevel(input.nextRank.minLevel) - input.totalXp) }
      : null,
    showAll: input.showAll,
    locked: FEATURES.filter((f) => !open[f.id]).map((f) => ({
      id: f.id,
      name: f.name,
      level: f.level,
      blurb: f.blurb,
      xpAway: Math.max(0, xpForLevel(f.level) - input.totalXp),
    })),
    open,
    guide: { checkin: guide("checkin"), firstSet: guide("firstSet"), firstWorkout: guide("firstWorkout"), weighIn: guide("weight") },
    checkinKind: input.checkinKind,
    workoutToday: { started: input.sessionsToday.length > 0, finished: input.sessionsToday.some((s) => s.ended) },
    workouts: input.finishedWorkouts,
    chestsWaiting: input.chestsWaiting,
    quests: open.quests ? input.quests : null,
    streak: currentStreak(input.checkinDates, input.today),
    streakStart: streakStart(input.checkinDates, input.today),
    daysAway: input.lastActivity ? daysBetween(input.lastActivity, input.today) : 0,
    isNew: input.finishedWorkouts === 0 && input.level < 5 && !input.showAll,
    gate: open.gates ? input.gate : null,
  };
}
