import { differenceInCalendarDays, parseISO } from "date-fns";

export type StreakResult = {
  current: number;
  longest: number;
  checkedInToday: boolean;
};

/**
 * Streak of consecutive days that have a check-in (whether or not the user went
 * to the gym, since the habit being tracked is logging). The current streak
 * stays alive until the end of today if yesterday was logged.
 */
export function computeStreak(dates: string[], today: string): StreakResult {
  const unique = [...new Set(dates)].sort();
  const set = new Set(unique);
  const checkedInToday = set.has(today);

  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of unique) {
    run =
      prev && differenceInCalendarDays(parseISO(d), parseISO(prev)) === 1
        ? run + 1
        : 1;
    longest = Math.max(longest, run);
    prev = d;
  }

  let current = 0;
  if (unique.length > 0) {
    const last = unique[unique.length - 1];
    const gap = differenceInCalendarDays(parseISO(today), parseISO(last));
    if (gap === 0 || gap === 1) current = run;
  }

  return { current, longest, checkedInToday };
}
