import { differenceInCalendarDays, parseISO } from "date-fns";
import type { WeightLog } from "@/lib/types";

export type WeightSummary = {
  latest: WeightLog | null;
  /** Latest minus first entry, in kg. */
  changeTotal: number | null;
  /** Latest minus the newest entry at least 7 days older, in kg. */
  change7d: number | null;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export function summarizeWeights(logs: WeightLog[]): WeightSummary {
  if (logs.length === 0) return { latest: null, changeTotal: null, change7d: null };

  const asc = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const latest = asc[asc.length - 1];
  const first = asc[0];

  const older = [...asc]
    .reverse()
    .find(
      (l) =>
        differenceInCalendarDays(parseISO(latest.date), parseISO(l.date)) >= 7,
    );

  return {
    latest,
    changeTotal: asc.length > 1 ? round1(latest.weight_kg - first.weight_kg) : null,
    change7d: older ? round1(latest.weight_kg - older.weight_kg) : null,
  };
}
