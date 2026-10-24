import { addDays, differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns";
import { ISO_FORMAT } from "@/lib/dates";
import type { AvailabilityBlock, WorkoutSession } from "@/lib/types";
import { weekRange } from "@/lib/week";

export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** Display order, Monday first. Values are Date#getDay numbers. */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** All tunable numbers for slot suggestions live here. Minutes unless noted. */
export const SCHEDULING = {
  stepMinutes: 30,
  dayStart: 6 * 60,
  dayEnd: 22 * 60,
  defaultDuration: 60,
  minDuration: 30,
  maxDuration: 120,
  durationRounding: 15,
  /** Time to get to or from the gym around a commitment. */
  travelBuffer: 30,
  /** Past sessions starting within this many minutes of a slot count as "usual time". */
  usualTimeWindow: 60,
  /** Do not suggest a slot that starts sooner than this after now. */
  leadMinutes: 15,
  weeklyTarget: 4,
  horizonDays: 7,
  weights: {
    sameWeekdayUsualTime: 3,
    sameWeekdayCap: 3,
    anyDayUsualTime: 2,
    anyDayCap: 5,
    wellRested: 1,
    trainedYesterday: -1,
    trainedToday: -2,
    weeklyTargetReached: -3,
  },
} as const;

export const toMinutes = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

export const toTime = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/** Median finished workout length, rounded up to 15 minutes and clamped to 30 to 120. */
export function typicalDurationMinutes(sessions: WorkoutSession[]): number {
  const durations = sessions
    .map((s) => s.duration_minutes)
    .filter((n): n is number => n !== null && n > 0)
    .sort((a, b) => a - b);
  if (durations.length === 0) return SCHEDULING.defaultDuration;

  const mid = Math.floor(durations.length / 2);
  const median =
    durations.length % 2 ? durations[mid] : (durations[mid - 1] + durations[mid]) / 2;
  const rounded = Math.ceil(median / SCHEDULING.durationRounding) * SCHEDULING.durationRounding;
  return Math.min(SCHEDULING.maxDuration, Math.max(SCHEDULING.minDuration, rounded));
}

export type SlotSuggestion = {
  /** YYYY-MM-DD */
  date: string;
  weekday: number;
  start: string;
  end: string;
  score: number;
  reasons: string[];
};

type Visit = { weekday: number; minutes: number };

/**
 * Best gym time for each of the next days, strongest first.
 *
 * A slot must fit inside 06:00 to 22:00, avoid every commitment (plus a travel
 * buffer) and start after `now`. Slots score higher when the user has trained
 * at that weekday and hour before, and when they would be rested. The best slot
 * per day is kept and the top `limit` days are returned.
 *
 * Times of day use the local time of the machine running this code.
 */
export function suggestSlots(input: {
  blocks: AvailabilityBlock[];
  sessions: WorkoutSession[];
  now: Date;
  durationMinutes?: number;
  limit?: number;
}): SlotSuggestion[] {
  const { blocks, sessions, now, limit = 3 } = input;
  const duration = input.durationMinutes ?? typicalDurationMinutes(sessions);
  const cfg = SCHEDULING;
  const w = cfg.weights;

  const visits: Visit[] = sessions.map((s) => {
    const d = new Date(s.started_at);
    return { weekday: d.getDay(), minutes: d.getHours() * 60 + d.getMinutes() };
  });
  const sessionDates = sessions.map((s) => s.date);
  // 1 at the exact time, fading linearly to 0 at the edge of the window, so the
  // suggestion lands on the habitual time instead of the earliest slot in range.
  const closeness = (v: Visit, start: number) =>
    Math.max(0, 1 - Math.abs(v.minutes - start) / cfg.usualTimeWindow);

  const today = startOfDay(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const perDay: SlotSuggestion[] = [];

  for (let i = 0; i < cfg.horizonDays; i++) {
    const day = addDays(today, i);
    const date = format(day, ISO_FORMAT);
    const weekday = day.getDay();

    const busy = blocks
      .filter((b) => b.weekday === weekday)
      .map((b) => [toMinutes(b.start_time) - cfg.travelBuffer, toMinutes(b.end_time) + cfg.travelBuffer]);

    const earliest =
      i === 0
        ? Math.max(cfg.dayStart, Math.ceil((nowMinutes + cfg.leadMinutes) / cfg.stepMinutes) * cfg.stepMinutes)
        : cfg.dayStart;

    // Context that is the same for every slot of the day.
    const previous = sessionDates.filter((d) => d <= date).sort().pop();
    const daysSince = previous ? differenceInCalendarDays(parseISO(date), parseISO(previous)) : null;
    const weekStart = weekRange(date).start;
    const weeklyPast = sessionDates.filter((d) => d >= weekStart && d < date).length;

    let best: SlotSuggestion | null = null;
    for (let start = earliest; start + duration <= cfg.dayEnd; start += cfg.stepMinutes) {
      const end = start + duration;
      if (busy.some(([bs, be]) => bs < end && be > start)) continue;

      const sum = (list: Visit[]) => list.reduce((acc, v) => acc + closeness(v, start), 0);
      const sameWeekday = sum(visits.filter((v) => v.weekday === weekday));
      const anyDay = sum(visits);

      let score =
        w.sameWeekdayUsualTime * Math.min(sameWeekday, w.sameWeekdayCap) +
        (w.anyDayUsualTime * Math.min(anyDay, w.anyDayCap)) / w.anyDayCap;

      const reasons: string[] = [];
      const hour = toTime(Math.round(start / 60) * 60);
      if (sameWeekday > 0) reasons.push(`You usually train on ${WEEKDAY_NAMES[weekday]}s around ${hour}`);
      else if (anyDay > 0) reasons.push(`You often train around ${hour}`);

      if (daysSince === 0) {
        score += w.trainedToday;
        reasons.push("You already trained that day");
      } else if (daysSince === 1) {
        score += w.trainedYesterday;
        reasons.push("You trained the day before");
      } else {
        score += w.wellRested;
        reasons.push("Well rested");
      }

      if (weeklyPast >= cfg.weeklyTarget) {
        score += w.weeklyTargetReached;
        reasons.push(`Already ${weeklyPast} workouts that week`);
      }

      reasons.push(
        blocks.some((b) => b.weekday === weekday)
          ? "Free around your commitments"
          : "No commitments logged",
      );

      // Strictly greater keeps the earliest slot on a tie.
      if (!best || score > best.score) {
        best = { date, weekday, start: toTime(start), end: toTime(end), score, reasons };
      }
    }
    if (best) perDay.push(best);
  }

  return perDay
    .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date))
    .slice(0, limit);
}
