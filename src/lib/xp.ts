import { dayMultiplier, firstActivityDate, welcomeWindow } from "@/lib/boosters";
import { nextRankAfter, rankForLevel, type Rank } from "@/lib/ranks";
import { longestStreak } from "@/lib/streak";
import type {
  BodyMeasurement,
  Checkin,
  ProgressPhoto,
  WeightLog,
  WorkoutSession,
  WorkoutSet,
} from "@/lib/types";

/**
 * XP is worked out from what is already logged, so it needs no extra table and can never drift from
 * the real data: delete an entry and its XP goes with it. Every rule is capped so that logging more
 * does not simply mean more XP: one reward per day for the daily things, and a workout only counts
 * once it is finished and has real sets in it.
 */
export const XP_RULES = {
  gymCheckin: 20,
  homeCheckin: 15,
  restCheckin: 5,
  weight: 10,
  measurement: 10,
  progressPhoto: 10,
  workout: 40,
  perSet: 2,
  /** Sets beyond this in one workout earn nothing, so padding a workout does not pay. */
  maxRewardedSets: 30,
  /** A finished workout needs at least this many sets to earn the workout XP. */
  minSetsForWorkout: 3,
} as const;

/**
 * One-time bonuses for the longest run of consecutive check-in days you have reached: [days, XP].
 * They are based on your best run, so they stay earned if a streak ends, and a streak you rebuild
 * cannot earn the same bonus twice. Any kind of check-in keeps a streak alive, a rest day included.
 */
export const STREAK_MILESTONES: readonly (readonly [days: number, xp: number])[] = [
  [3, 30],
  [7, 70],
  [14, 150],
  [30, 400],
  [60, 800],
  [100, 1500],
];

export type XpSource = "gym" | "home" | "rest" | "weight" | "measurement" | "photo" | "workout" | "sets" | "streak";

export const XP_SOURCE_LABELS: Record<XpSource, string> = {
  gym: "Gym check-ins",
  home: "Home workout check-ins",
  rest: "Rest day check-ins",
  weight: "Weigh-ins",
  measurement: "Measurements",
  photo: "Progress photo days",
  workout: "Finished workouts",
  sets: "Sets logged",
  streak: "Streak milestones",
};

/** How to earn each, in words, for the explanation page. */
export const XP_SOURCE_HINTS: Record<XpSource, string> = {
  gym: `${XP_RULES.gymCheckin} XP for each day you check in at the gym.`,
  home: `${XP_RULES.homeCheckin} XP for each day you check in with a workout at home.`,
  rest: `${XP_RULES.restCheckin} XP for each rest day you check in, so honest rest days count too.`,
  weight: `${XP_RULES.weight} XP for each day you log your weight (once a day).`,
  measurement: `${XP_RULES.measurement} XP for each day you log measurements.`,
  photo: `${XP_RULES.progressPhoto} XP for each day you upload a progress photo (once a day).`,
  workout: `${XP_RULES.workout} XP for each finished workout with at least ${XP_RULES.minSetsForWorkout} sets.`,
  sets: `${XP_RULES.perSet} XP for each set in a finished workout, up to ${XP_RULES.maxRewardedSets} sets per workout.`,
  streak: `A one-time bonus for the longest run of check-in days you reach: ${STREAK_MILESTONES.map(
    ([days, xp]) => `${days} days for ${xp} XP`,
  ).join(", ")}. Any check-in keeps a streak alive, rest days too.`,
};

export const XP_SOURCES = Object.keys(XP_SOURCE_LABELS) as XpSource[];

export type XpInput = {
  checkins: Pick<Checkin, "date" | "kind">[];
  weights: Pick<WeightLog, "date">[];
  measurements: Pick<BodyMeasurement, "date">[];
  photos: Pick<ProgressPhoto, "date">[];
  sessions: Pick<WorkoutSession, "id" | "date" | "ended_at">[];
  sets: Pick<WorkoutSet, "session_id">[];
  /** Days a Double XP Day booster was used on. The welcome boost needs no input, it comes from the data. */
  boostedDays?: readonly string[];
  /** Set to false to leave the welcome boost out. Only tests do this. */
  welcomeBoost?: boolean;
};

export type XpLine = {
  source: XpSource;
  label: string;
  count: number;
  /** Includes `bonus`. */
  xp: number;
  /** The part of `xp` that came from boosts. */
  bonus: number;
};

export type XpSummary = {
  total: number;
  lines: XpLine[];
  /** The welcome boost's days, or null before any activity. */
  welcome: { start: string; end: string } | null;
  /** Finished workouts that count, for working out boosters. */
  workouts: number;
  longestStreak: number;
  /** The earliest day with any activity. */
  firstDate: string | null;
};

const distinctDates = (dates: string[]) => [...new Set(dates)];

export function computeXp(input: XpInput): XpSummary {
  const checkinDates = input.checkins.map((c) => c.date);
  const streakDays = longestStreak(checkinDates);
  const reached = STREAK_MILESTONES.filter(([days]) => streakDays >= days);

  const setsBySession = new Map<string, number>();
  for (const s of input.sets) setsBySession.set(s.session_id, (setsBySession.get(s.session_id) ?? 0) + 1);

  // Every XP reward as (date, amount), so a boosted day can double exactly what happened on it.
  const entries: Record<XpSource, { date: string; xp: number }[]> = {
    gym: [], home: [], rest: [], weight: [], measurement: [], photo: [], workout: [], sets: [], streak: [],
  };
  const countOf: Record<XpSource, number> = {
    gym: 0, home: 0, rest: 0, weight: 0, measurement: 0, photo: 0, workout: 0, sets: 0, streak: reached.length,
  };

  for (const kind of ["gym", "home", "rest"] as const) {
    const days = distinctDates(input.checkins.filter((c) => c.kind === kind).map((c) => c.date));
    const each = kind === "gym" ? XP_RULES.gymCheckin : kind === "home" ? XP_RULES.homeCheckin : XP_RULES.restCheckin;
    countOf[kind] = days.length;
    entries[kind] = days.map((date) => ({ date, xp: each }));
  }
  const daily: [XpSource, string[], number][] = [
    ["weight", input.weights.map((w) => w.date), XP_RULES.weight],
    ["measurement", input.measurements.map((m) => m.date), XP_RULES.measurement],
    ["photo", input.photos.map((p) => p.date), XP_RULES.progressPhoto],
  ];
  for (const [source, dates, each] of daily) {
    const days = distinctDates(dates);
    countOf[source] = days.length;
    entries[source] = days.map((date) => ({ date, xp: each }));
  }

  for (const session of input.sessions) {
    if (session.ended_at === null) continue; // still in progress, nothing yet
    const sets = setsBySession.get(session.id) ?? 0;
    if (sets < XP_RULES.minSetsForWorkout) continue;
    const rewarded = Math.min(sets, XP_RULES.maxRewardedSets);
    countOf.workout += 1;
    countOf.sets += rewarded;
    entries.workout.push({ date: session.date, xp: XP_RULES.workout });
    entries.sets.push({ date: session.date, xp: rewarded * XP_RULES.perSet });
  }

  const firstDate = firstActivityDate([
    ...checkinDates,
    ...input.weights.map((w) => w.date),
    ...input.measurements.map((m) => m.date),
    ...input.photos.map((p) => p.date),
    ...input.sessions.map((s) => s.date),
  ]);
  const welcome = input.welcomeBoost === false ? null : welcomeWindow(firstDate);
  const boosted = new Set(input.boostedDays ?? []);

  const lines = XP_SOURCES.map((source): XpLine => {
    if (source === "streak") {
      // Milestone bonuses are a reward for the whole run, not for one day, so boosts do not double them.
      const xp = reached.reduce((sum, [, bonus]) => sum + bonus, 0);
      return { source, label: XP_SOURCE_LABELS[source], count: countOf[source], xp, bonus: 0 };
    }
    let xp = 0;
    let bonus = 0;
    for (const entry of entries[source]) {
      const doubled = entry.xp * dayMultiplier(entry.date, welcome, boosted);
      xp += doubled;
      bonus += doubled - entry.xp;
    }
    return { source, label: XP_SOURCE_LABELS[source], count: countOf[source], xp, bonus };
  });

  return {
    total: lines.reduce((sum, l) => sum + l.xp, 0),
    lines,
    welcome,
    workouts: countOf.workout,
    longestStreak: streakDays,
    firstDate,
  };
}

/**
 * Going from level n to n + 1 costs 12 + n XP, so the first levels fly by and each one is a little
 * longer than the last. Total XP to reach level L is (L - 1)(L + 24) / 2: level 2 at 13, level 10
 * at 153, level 50 at 1,813 and level 100 at 6,138.
 */
export const xpForLevel = (level: number): number => ((level - 1) * (level + 24)) / 2;

export type LevelInfo = {
  level: number;
  rank: Rank;
  /** The next rank up, or null at the top. */
  nextRank: Rank | null;
  /** XP still missing for the next rank, or null at the top. */
  xpToNextRank: number | null;
  total: number;
  /** XP earned since this level began. */
  intoLevel: number;
  /** XP this level takes from start to finish. */
  levelSpan: number;
  /** XP still missing for the next level. */
  toNext: number;
  /** 0 to 1, how far through the current level. */
  progress: number;
};

export function levelForXp(total: number): LevelInfo {
  const xp = Math.max(0, Math.floor(total));
  // Solves (L - 1)(L + 24) / 2 <= xp. The estimate can be off by one at the edges, so correct it.
  let level = Math.max(1, Math.floor(-11.5 + Math.sqrt(132.25 + 2 * (12 + xp))));
  while (xpForLevel(level + 1) <= xp) level += 1;
  while (level > 1 && xpForLevel(level) > xp) level -= 1;

  const start = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const nextRank = nextRankAfter(level);
  return {
    level,
    rank: rankForLevel(level),
    nextRank,
    xpToNextRank: nextRank ? xpForLevel(nextRank.minLevel) - xp : null,
    total: xp,
    intoLevel: xp - start,
    levelSpan: next - start,
    toNext: next - xp,
    progress: (xp - start) / (next - start),
  };
}
