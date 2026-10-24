import { addDays, endOfWeek, format, parseISO, startOfWeek } from "date-fns";
import { ISO_FORMAT } from "@/lib/dates";
import type { WorkoutSession, WorkoutSet } from "@/lib/types";
import { formatDuration, sessionVolume } from "@/lib/workout";

/** Monday to Sunday week containing `today` (README section 7.2). */
export function weekRange(today: string): { start: string; end: string } {
  const d = parseISO(today);
  return {
    start: format(startOfWeek(d, { weekStartsOn: 1 }), ISO_FORMAT),
    end: format(endOfWeek(d, { weekStartsOn: 1 }), ISO_FORMAT),
  };
}

export const addDaysISO = (date: string, n: number) =>
  format(addDays(parseISO(date), n), ISO_FORMAT);

export type DaySummary = { date: string; sessions: number; volume: number };

export type WeekSummary = {
  start: string;
  sessions: number;
  /** Minutes of finished workouts. A workout in progress has no duration yet. */
  minutes: number;
  sets: number;
  volume: number;
  /** Always 7 entries, Monday first. */
  days: DaySummary[];
};

/** Totals for the 7 days beginning at `start` (a Monday). */
export function summarizeWeek(
  sessions: WorkoutSession[],
  sets: WorkoutSet[],
  start: string,
): WeekSummary {
  const dates = Array.from({ length: 7 }, (_, i) => addDaysISO(start, i));
  const inWeek = sessions.filter((s) => s.date >= dates[0] && s.date <= dates[6]);
  const ids = new Set(inWeek.map((s) => s.id));
  const weekSets = sets.filter((s) => ids.has(s.session_id));

  const days = dates.map((date) => {
    const daySessions = inWeek.filter((s) => s.date === date);
    const dayIds = new Set(daySessions.map((s) => s.id));
    return {
      date,
      sessions: daySessions.length,
      volume: sessionVolume(weekSets.filter((s) => dayIds.has(s.session_id))),
    };
  });

  return {
    start,
    sessions: inWeek.length,
    minutes: inWeek.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0),
    sets: weekSets.length,
    volume: sessionVolume(weekSets),
    days,
  };
}

/** "+3", "-2", "0" with an optional formatter for the magnitude. */
export function formatDelta(
  delta: number,
  format: (abs: number) => string = String,
): string {
  if (delta === 0) return "0";
  return `${delta > 0 ? "+" : "-"}${format(Math.abs(delta))}`;
}

export const formatMinutesDelta = (d: number) => formatDelta(d, formatDuration);

export const formatKgDelta = (d: number) =>
  formatDelta(Math.round(d), (n) => `${n.toLocaleString("en-US")} kg`);
