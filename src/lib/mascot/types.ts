import type { FeatureId } from "@/lib/unlocks";

/** How Sera looks while she says something. */
export type Mood = "calm" | "happy" | "cheer" | "thinking" | "surprised" | "sleepy" | "smug" | "flustered" | "annoyed";

export const MOODS: readonly Mood[] = ["calm", "happy", "cheer", "thinking", "surprised", "sleepy", "smug", "flustered", "annoyed"];

/** The small things she does when nobody is talking to her: a hair flip, her tongue out, a puffed cheek, a haughty turn of the head. */
export type Quirk = "hairflip" | "tongue" | "puff" | "hmph";

export const QUIRKS: readonly Quirk[] = ["hairflip", "tongue", "puff", "hmph"];

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
  /** The first day of that streak, or null without one. */
  streakStart: string | null;
  /** Days since the last check-in, workout or log. 0 means today. */
  daysAway: number;
  /** A brand new account: nothing trained yet and still at the start. */
  isNew: boolean;
  /** This week's gate, once gates are open. Names and numbers only. */
  gate: { weekStart: string; name: string; boss: string; rank: string; xp: number; booster: boolean; cleared: boolean } | null;
};

/** What her arms do on the stage. */
export type StagePose = "idle" | "wave" | "point" | "cheer" | "smug" | "crossed" | "taunt" | "hairflip";

export const POSES: readonly StagePose[] = ["idle", "wave", "point", "cheer", "smug", "crossed", "taunt", "hairflip"];

/** A reply the user can tap. */
export type Reply = {
  label: string;
  /** The node to go to next. */
  next?: string;
  /** Or something to do. */
  action?: "close" | "quietToday" | "off" | "showAll";
  /** Or a page to go to. */
  href?: string;
  /** Or a tour to start, by id. "here" means the tour of the page the user is on. */
  tour?: string;
};

/** What a node needs besides the context. */
export type NodeArgs = {
  /** The page the user is on. */
  path?: string;
  /** The feature a locked page was about. */
  featureId?: FeatureId;
  /** The features that just opened. */
  features?: FeatureId[];
  /** The streak milestone reached, in days. */
  days?: number;
  /** The tour a tour offer is about. */
  tourId?: string;
};

export type RenderedNode = {
  id: string;
  mood: Mood;
  lines: string[];
  replies: Reply[];
};

/**
 * One time Sera speaks up on her own. A bubble is a small speech bubble by her avatar, a stage is Sera big on the
 * screen (`node` is then a stage id, see `beats.ts`), a tour offer asks whether to guide you around the page.
 */
export type Moment = {
  /** Remembered, so it is not told twice. */
  key: string;
  kind: "bubble" | "stage" | "tourOffer";
  node: string;
  args?: NodeArgs;
};

/** A big appearance: Sera large over a dimmed screen, saying a few short beats. */
export type StageScript = {
  id: string;
  pose: StagePose;
  mood: Mood;
  /** The glow behind her. */
  halo: "blue" | "gold";
  /** A small label above her words, like "Gate cleared". */
  tag: string;
  /** One card of words per beat, each short. */
  beats: string[];
  /** A short line under the last beat, like the reward. */
  facts: string[];
  /** The buttons on the last beat. Empty for one that closes itself. */
  replies: Reply[];
  /** Her face on the last beat, when it changes (she perks up). */
  endMood?: Mood;
  /** It closes by itself after a few seconds, like the daily hello. */
  auto: boolean;
};
