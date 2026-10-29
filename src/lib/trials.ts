import { RANKS, type Rank } from "@/lib/ranks";
import { addDaysISO } from "@/lib/week";

/**
 * Rank trials. From the Rep Machine rank up, reaching the level of a rank is not enough: you first clear a
 * short trial, a burst of finished workouts. Until then the level bar stops one XP short of the rank, with
 * your XP still counting, and clearing the trial lets the level through. A trial is evaluated from the
 * finished workouts, and once cleared it is remembered (it is the one thing in the game that is stored),
 * so it can never be taken back.
 */
export const TRIAL_FROM_LEVEL = 25;

export type Trial = {
  rank: Rank;
  /** Finished workouts needed. */
  workouts: number;
  /** Within this many days. */
  days: number;
};

/** The ranks that have a trial, in order. */
export const TRIAL_RANKS: readonly Rank[] = RANKS.filter((r) => r.minLevel >= TRIAL_FROM_LEVEL);

export function trialFor(rank: Rank): Trial | null {
  const index = TRIAL_RANKS.findIndex((r) => r.id === rank.id);
  if (index === -1) return null;
  return { rank, workouts: Math.min(6, 3 + Math.floor(index / 2)), days: 7 + Math.floor(index / 4) * 3 };
}

/** The most finished workouts in any window of `days` days, ending on any of the given dates. */
export function bestWindow(workoutDates: string[], days: number): number {
  const sorted = [...workoutDates].sort();
  let best = 0;
  for (let i = 0; i < sorted.length; i++) {
    const from = sorted[i];
    const to = addDaysISO(from, days - 1);
    let count = 0;
    for (let j = i; j < sorted.length && sorted[j] <= to; j++) count += 1;
    best = Math.max(best, count);
  }
  return best;
}

export type TrialProgress = { trial: Trial; best: number; passed: boolean };

/** How far a trial is, from the dates of the finished workouts. */
export function trialProgress(trial: Trial, workoutDates: string[]): TrialProgress {
  const best = bestWindow(workoutDates, trial.days);
  return { trial, best: Math.min(best, trial.workouts), passed: best >= trial.workouts };
}

/** The first trial rank the level has reached but whose trial is not cleared yet, or null. */
export function blockingTrial(rawLevel: number, cleared: ReadonlySet<string>): Trial | null {
  for (const rank of TRIAL_RANKS) {
    if (rawLevel >= rank.minLevel && !cleared.has(rank.id)) return trialFor(rank);
  }
  return null;
}

/** The highest level allowed: one short of a blocking rank, or no limit. */
export const levelCap = (blocking: Trial | null): number | null => (blocking ? blocking.rank.minLevel - 1 : null);
