import type { FeatureId } from "@/lib/unlocks";

/** How Sera looks while she says something. */
export type Mood = "calm" | "happy" | "cheer" | "thinking" | "surprised" | "sleepy";

export const MOODS: readonly Mood[] = ["calm", "happy", "cheer", "thinking", "surprised", "sleepy"];

/**
 * Everything Sera knows about you, and nothing more: counts, flags and the names of features. It never holds
 * weight, photos, locations or what you wrote. It is built on the server and sent to the browser as plain data.
 */
export type SeraContext = {
  /** The level now, and the XP total. */
  level: number;
  totalXp: number;
  /** XP still missing for the next level. */
  xpToNext: number;
  /** The next rank, or null at the top. */
  nextRank: { name: string; level: number; xpAway: number } | null;
  /** "Show all features" is on, so nothing is locked. */
  showAll: boolean;
  /** The features still locked, soonest first. Empty with "show all" on. */
  locked: { id: FeatureId; name: string; level: number; blurb: string; xpAway: number }[];
  /** Which features are open now. */
  open: Record<FeatureId, boolean>;
  /** The getting started steps, by id. */
  guide: { checkin: boolean; firstSet: boolean; firstWorkout: boolean; weighIn: boolean };
  /** Today's check-in, or null. */
  checkinKind: "gym" | "home" | "rest" | null;
  /** A workout has been started today, and whether one is finished. */
  workoutToday: { started: boolean; finished: boolean };
  /** Finished workouts in total. */
  workouts: number;
  chestsWaiting: number;
  /** Today's quests, when quests are open. */
  quests: { done: number; total: number } | null;
  /** Days in a row with a check-in, counting today if you checked in. */
  streak: number;
  /** Days since the last check-in, workout or log. 0 means today. */
  daysAway: number;
  /** A brand new account: nothing trained yet and still at the start. */
  isNew: boolean;
};

/** A reply the user can tap. */
export type Reply = {
  label: string;
  /** The node to go to next. */
  next?: string;
  /** Or something to do. */
  action?: "close" | "quietToday" | "off" | "showAll";
  /** Or a page to go to. */
  href?: string;
};

/** What a node needs besides the context. */
export type NodeArgs = {
  /** The page the user is on. */
  path?: string;
  /** The feature a locked page was about. */
  featureId?: FeatureId;
  /** The features that just opened. */
  features?: FeatureId[];
};

export type RenderedNode = {
  id: string;
  mood: Mood;
  lines: string[];
  replies: Reply[];
};

/** One time Sera speaks up on her own. */
export type Moment = {
  /** Remembered, so it is not told twice. */
  key: string;
  node: string;
  args?: NodeArgs;
};
