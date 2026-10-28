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
  sessions: Pick<WorkoutSession, "id" | "ended_at">[];
  sets: Pick<WorkoutSet, "session_id">[];
};

export type XpLine = { source: XpSource; label: string; count: number; xp: number };

export type XpSummary = { total: number; lines: XpLine[] };

const distinct = (dates: string[]) => new Set(dates).size;

export function computeXp(input: XpInput): XpSummary {
  const daysOf = (kind: Checkin["kind"]) => distinct(input.checkins.filter((c) => c.kind === kind).map((c) => c.date));
  const reached = STREAK_MILESTONES.filter(([days]) => longestStreak(input.checkins.map((c) => c.date)) >= days);

  const setsBySession = new Map<string, number>();
  for (const s of input.sets) setsBySession.set(s.session_id, (setsBySession.get(s.session_id) ?? 0) + 1);

  let workouts = 0;
  let rewardedSets = 0;
  for (const session of input.sessions) {
    if (session.ended_at === null) continue; // still in progress, nothing yet
    const sets = setsBySession.get(session.id) ?? 0;
    if (sets < XP_RULES.minSetsForWorkout) continue;
    workouts += 1;
    rewardedSets += Math.min(sets, XP_RULES.maxRewardedSets);
  }

  const counts: Record<XpSource, [number, number]> = {
    gym: [daysOf("gym"), XP_RULES.gymCheckin],
    home: [daysOf("home"), XP_RULES.homeCheckin],
    rest: [daysOf("rest"), XP_RULES.restCheckin],
    weight: [distinct(input.weights.map((w) => w.date)), XP_RULES.weight],
    measurement: [distinct(input.measurements.map((m) => m.date)), XP_RULES.measurement],
    photo: [distinct(input.photos.map((p) => p.date)), XP_RULES.progressPhoto],
    workout: [workouts, XP_RULES.workout],
    sets: [rewardedSets, XP_RULES.perSet],
    // Not a count times a rate: the count is how many milestones, the XP is what they add up to.
    streak: [reached.length, 0],
  };

  const lines = XP_SOURCES.map((source) => {
    const [count, each] = counts[source];
    const xp = source === "streak" ? reached.reduce((sum, [, bonus]) => sum + bonus, 0) : count * each;
    return { source, label: XP_SOURCE_LABELS[source], count, xp };
  });
  return { total: lines.reduce((sum, l) => sum + l.xp, 0), lines };
}

/** Total XP needed to reach a level: 0 for level 1, 100 for level 2, 300 for 3, 600 for 4, and so on. */
export const xpForLevel = (level: number): number => 50 * level * (level - 1);

const TITLES: [minLevel: number, title: string][] = [
  [30, "Legend"],
  [20, "Veteran"],
  [15, "Athlete"],
  [10, "Committed"],
  [5, "Regular"],
  [1, "Rookie"],
];

export const titleForLevel = (level: number): string => TITLES.find(([min]) => level >= min)![1];

export type LevelInfo = {
  level: number;
  title: string;
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
  // Largest n with 50 n (n - 1) <= xp. The estimate can be off by one at the edges, so correct it.
  let level = Math.max(1, Math.floor((1 + Math.sqrt(1 + xp / 12.5)) / 2));
  while (xpForLevel(level + 1) <= xp) level += 1;
  while (level > 1 && xpForLevel(level) > xp) level -= 1;

  const start = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return {
    level,
    title: titleForLevel(level),
    total: xp,
    intoLevel: xp - start,
    levelSpan: next - start,
    toNext: next - xp,
    progress: (xp - start) / (next - start),
  };
}
