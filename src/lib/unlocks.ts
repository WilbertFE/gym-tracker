/**
 * The app shows itself in steps. A new user sees check-in, workouts and their level, and the rest
 * opens as they level up, each unlock announced once. This keeps the first days simple, and gives
 * every level something to look forward to. Everything is decided by level, so an account that is
 * already past a level never loses anything, and "Show all features" in Settings opens everything.
 */
export type FeatureId = "quests" | "boosters" | "status" | "leaderboard" | "titles" | "gates" | "muscleLevels" | "trials";

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

/** In order of unlocking. Several features can share a level. */
export const FEATURES: readonly Feature[] = [
  { id: "quests", name: "Daily and weekly quests", level: 5, blurb: "Small goals every day and week for bonus XP.", href: "/dashboard" },
  { id: "boosters", name: "XP boosters", level: 5, blurb: "Double the XP of a day. Earn them by training.", href: "/dashboard/level" },
  { id: "status", name: "Status window", level: 8, blurb: "Your rank letter and five stats, worked out from your training.", href: "/status" },
  { id: "leaderboard", name: "Leaderboard", level: 10, blurb: "Compare your XP with others, worldwide and at home.", href: "/leaderboard" },
  { id: "titles", name: "Titles", level: 10, blurb: "Earn titles for streaks and milestones and wear one.", href: "/status" },
  { id: "gates", name: "Weekly gates", level: 12, blurb: "A weekly boss that every set you log hurts.", href: "/dashboard" },
  { id: "muscleLevels", name: "Muscle levels", level: 15, blurb: "Every muscle gets its own level.", href: "/body" },
  { id: "trials", name: "Rank trials", level: 15, blurb: "Prove yourself before you reach the next rank.", href: "/dashboard/level" },
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
