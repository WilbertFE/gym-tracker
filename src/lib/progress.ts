import { differenceInCalendarDays, parseISO } from "date-fns";
import type { WeightLog } from "@/lib/types";

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Newest row dated on or before `date`, or null. Input order does not matter. */
export function latestOnOrBefore<T extends { date: string }>(rows: T[], date: string): T | null {
  let best: T | null = null;
  for (const row of rows) {
    if (row.date <= date && (!best || row.date > best.date)) best = row;
  }
  return best;
}

export type ProgressComparison = {
  /** Positive when `after` is later than `before`. */
  daysApart: number;
  weight: { before: number; after: number; change: number } | null;
};

/**
 * Compares two dates using the nearest weight logged on or before each date.
 * The weight is only included when both dates have one and they come from two
 * different entries.
 */
export function compareProgress(input: {
  beforeDate: string;
  afterDate: string;
  weights: WeightLog[];
}): ProgressComparison {
  const { beforeDate, afterDate, weights } = input;

  const wBefore = latestOnOrBefore(weights, beforeDate);
  const wAfter = latestOnOrBefore(weights, afterDate);

  return {
    daysApart: differenceInCalendarDays(parseISO(afterDate), parseISO(beforeDate)),
    weight:
      wBefore && wAfter && wBefore.id !== wAfter.id
        ? {
            before: wBefore.weight_kg,
            after: wAfter.weight_kg,
            change: round1(wAfter.weight_kg - wBefore.weight_kg),
          }
        : null,
  };
}

/** "5 weeks", "3 days", "1 day". */
export function describeSpan(days: number): string {
  const d = Math.abs(days);
  if (d >= 14) return `${Math.round(d / 7)} weeks`;
  return `${d} day${d === 1 ? "" : "s"}`;
}
