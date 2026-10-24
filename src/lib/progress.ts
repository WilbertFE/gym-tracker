import { differenceInCalendarDays, parseISO } from "date-fns";
import type { BodyMeasurement, WeightLog } from "@/lib/types";

export const MEASUREMENT_FIELDS = [
  { key: "chest_cm", label: "Chest", unit: "cm" },
  { key: "waist_cm", label: "Waist", unit: "cm" },
  { key: "hips_cm", label: "Hips", unit: "cm" },
  { key: "arm_cm", label: "Arm", unit: "cm" },
  { key: "thigh_cm", label: "Thigh", unit: "cm" },
  { key: "body_fat_pct", label: "Body fat", unit: "%" },
] as const;

export type MeasurementKey = (typeof MEASUREMENT_FIELDS)[number]["key"];

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Newest row dated on or before `date`, or null. Input order does not matter. */
export function latestOnOrBefore<T extends { date: string }>(rows: T[], date: string): T | null {
  let best: T | null = null;
  for (const row of rows) {
    if (row.date <= date && (!best || row.date > best.date)) best = row;
  }
  return best;
}

export type MeasurementChange = {
  key: MeasurementKey;
  label: string;
  unit: string;
  before: number;
  after: number;
  change: number;
};

export type ProgressComparison = {
  /** Positive when `after` is later than `before`. */
  daysApart: number;
  weight: { before: number; after: number; change: number } | null;
  measurements: MeasurementChange[];
};

/**
 * Compares two dates using the nearest weight and measurement logged on or
 * before each date. A metric is only included when both dates have a value
 * and they come from two different entries.
 */
export function compareProgress(input: {
  beforeDate: string;
  afterDate: string;
  weights: WeightLog[];
  measurements: BodyMeasurement[];
}): ProgressComparison {
  const { beforeDate, afterDate, weights, measurements } = input;

  const wBefore = latestOnOrBefore(weights, beforeDate);
  const wAfter = latestOnOrBefore(weights, afterDate);

  const changes: MeasurementChange[] = [];
  for (const field of MEASUREMENT_FIELDS) {
    // Nearest entry on or before each date that actually has this metric.
    const withMetric = measurements.filter((m) => m[field.key] !== null);
    const before = latestOnOrBefore(withMetric, beforeDate);
    const after = latestOnOrBefore(withMetric, afterDate);
    // The same entry on both sides is not a comparison.
    if (!before || !after || before.id === after.id) continue;
    const b = before[field.key] as number;
    const a = after[field.key] as number;
    changes.push({ ...field, before: b, after: a, change: round1(a - b) });
  }

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
    measurements: changes,
  };
}

/**
 * Change versus the previous entry that has the same metric. `rowsDesc` must
 * be sorted newest first. Returns null for the oldest entry.
 */
export function deltaVsPrevious(
  rowsDesc: BodyMeasurement[],
  index: number,
  key: MeasurementKey,
): number | null {
  const current = rowsDesc[index]?.[key];
  if (current === null || current === undefined) return null;
  for (let i = index + 1; i < rowsDesc.length; i++) {
    const prev = rowsDesc[i][key];
    if (prev !== null) return round1(current - prev);
  }
  return null;
}

/** "5 weeks", "3 days", "1 day". */
export function describeSpan(days: number): string {
  const d = Math.abs(days);
  if (d >= 14) return `${Math.round(d / 7)} weeks`;
  return `${d} day${d === 1 ? "" : "s"}`;
}
