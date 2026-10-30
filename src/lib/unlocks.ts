/**
 * The app shows itself in steps. A new user sees check-in, workouts and their level, and the rest
 * opens as they level up, each unlock announced once. This keeps the first days simple, and gives
 * every level something to look forward to. Everything is decided by level, so an account that is
 * already past a level never loses anything, and "Show all features" in Settings opens everything.
 */
export type FeatureId =
  | "body"
  | "quests"
  | "chests"
  | "boosters"
  | "schedule"
  | "status"
  | "membership"
  | "leaderboard"
  | "friends"
  | "titles"
  | "profile"
  | "collection"
  | "gates"
  | "muscleLevels"
  | "trials";

export type Feature = {
  id: FeatureId;
  name: string;
  /** The level that opens it. */
  level: number;
  /** One line for the teaser card and the "unlocked" tip. */
  blurb: string;
  /** Where it lives, to link to once unlocked. */
  href: string;
};

/**
 * The focus plan, in order of unlocking. Level 1 is only the dashboard (check-in and the level card), workouts and
 * settings, so a new user spends the first stretch on the main routine. The levels are paced for about a week of
 * dedicated training (five days, with the welcome boost doubling the first week's XP) and about two weeks of lighter
 * training; Rank trials open at 22 because the first trial holds the level at 24 (see `trials.ts`). Several features can share a level.
 */
export const FEATURES: readonly Feature[] = [
  { id: "body", name: "Body", level: 4, blurb: "Your muscle map and your body weight chart.", href: "/body" },
  { id: "quests", name: "Daily and weekly quests", level: 10, blurb: "Small goals every day and week for bonus XP.", href: "/dashboard" },
  { id: "boosters", name: "XP boosters", level: 10, blurb: "Double the XP of a day. Earn them by training.", href: "/dashboard/level" },
  { id: "chests", name: "Quest chests", level: 10, blurb: "Finish a day or week of quests to open a chest with a random item.", href: "/dashboard" },
  { id: "schedule", name: "Schedule", level: 14, blurb: "Find the best time to train around your classes.", href: "/schedule" },
  { id: "status", name: "Status window", level: 14, blurb: "Your rank letter and five stats, worked out from your training.", href: "/status" },
  { id: "membership", name: "Membership", level: 14, blurb: "Track your gym membership and when it ends.", href: "/membership" },
  { id: "leaderboard", name: "Leaderboard", level: 18, blurb: "Compare your XP with others, worldwide and at home.", href: "/leaderboard" },
  { id: "friends", name: "Friends", level: 18, blurb: "Add friends with a code and fight a weekly boss together.", href: "/friends" },
  { id: "titles", name: "Titles", level: 18, blurb: "Earn titles for streaks and milestones and wear one.", href: "/status" },
  { id: "profile", name: "Profile", level: 18, blurb: "A player page other users can open, if you choose.", href: "/profile" },
  { id: "collection", name: "Collection", level: 18, blurb: "Every item you found in chests, and the ones you wear.", href: "/collection" },
  { id: "trials", name: "Rank trials", level: 22, blurb: "Prove yourself before you reach the next rank.", href: "/dashboard/level" },
  { id: "gates", name: "Weekly gates", level: 26, blurb: "A weekly boss that every set you log hurts.", href: "/dashboard" },
  { id: "muscleLevels", name: "Muscle levels", level: 33, blurb: "Every muscle gets its own level.", href: "/body" },
];

const byId = new Map(FEATURES.map((f) => [f.id, f]));

export const featureById = (id: FeatureId): Feature => byId.get(id)!;

/** Whether a feature is open. `showAll` opens everything. */
export const isUnlocked = (id: FeatureId, level: number, showAll = false): boolean =>
  showAll || level >= featureById(id).level;

/** The features still locked, soonest first, at most `count`. Used for the one teaser card. */
export function nextUnlocks(level: number, count = 2): Feature[] {
  return FEATURES.filter((f) => f.level > level).slice(0, count);
}

/** The features that opened when going from one level to another. */
export function unlockedBetween(fromLevel: number, toLevel: number): Feature[] {
  return FEATURES.filter((f) => f.level > fromLevel && f.level <= toLevel);
}

/** The level of the next unlock, or null when everything is open. */
export function nextUnlockLevel(level: number): number | null {
  return FEATURES.find((f) => f.level > level)?.level ?? null;
}
