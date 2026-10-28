import type { Rank } from "@/lib/ranks";

/**
 * XP is worked out from the data, so there is no "XP earned" event to listen to. The pop-up finds
 * what an action was worth by comparing the total before and after. Everything here is pure so the
 * rules are easy to test; the component only shows the result.
 */

/** What the client remembers between checks, and what `/api/xp` returns. */
export type XpSnapshot = {
  userId: string;
  total: number;
  level: number;
  /** 0 to 1 through the current level. */
  progress: number;
  rank: Rank;
  /** XP per source, to name what was gained. */
  lines: { source: string; label: string; xp: number }[];
  /** Today's XP is doubled by a boost. */
  boostedToday?: boolean;
};

export type XpGain = {
  gained: number;
  /** What earned it, biggest first. */
  items: { label: string; xp: number }[];
  from: { level: number; progress: number };
  to: { level: number; progress: number };
  leveledUp: boolean;
  rankedUp: boolean;
  /** The XP was earned on a boosted day. */
  boosted: boolean;
  /** The rank now. Shown as a badge when `rankedUp`. */
  rank: Rank;
};

/** This many levels in one go count as a big moment, like a new rank or an unlock. */
export const BIG_LEVEL_JUMP = 3;

/**
 * Whether a gain deserves the full screen: several levels at once, a new rank, or something that just
 * unlocked (`unlockedCount` of them). Everything smaller keeps the small pop-up.
 */
export const isBigMoment = (gain: XpGain, unlockedCount: number): boolean =>
  levelsGained(gain) >= BIG_LEVEL_JUMP || gain.rankedUp || unlockedCount > 0;

/** How many levels, if any, were gained. */
export const levelsGained = (gain: XpGain): number => gain.to.level - gain.from.level;

/**
 * The gain between two snapshots, or null when there is none. Less XP than before, for example after
 * deleting an entry, is not a gain and shows nothing. A different user also shows nothing.
 */
export function diffXp(before: XpSnapshot | null, after: XpSnapshot): XpGain | null {
  if (!before || before.userId !== after.userId) return null;
  const gained = after.total - before.total;
  if (gained <= 0) return null;

  const earlier = new Map(before.lines.map((l) => [l.source, l.xp]));
  const items = after.lines
    .map((l) => ({ label: l.label, xp: l.xp - (earlier.get(l.source) ?? 0) }))
    .filter((i) => i.xp > 0)
    .sort((a, b) => b.xp - a.xp);

  return {
    gained,
    items,
    from: { level: before.level, progress: before.progress },
    to: { level: after.level, progress: after.progress },
    leveledUp: after.level > before.level,
    rankedUp: after.rank.id !== before.rank.id,
    boosted: after.boostedToday === true,
    rank: after.rank,
  };
}

/**
 * Folds a second gain into one that is still on screen, so quick actions (several sets, a check-in
 * and a photo) show one pop-up that keeps growing instead of a queue of them.
 */
export function mergeGains(first: XpGain, next: XpGain): XpGain {
  const byLabel = new Map<string, number>();
  for (const item of [...first.items, ...next.items]) byLabel.set(item.label, (byLabel.get(item.label) ?? 0) + item.xp);
  return {
    gained: first.gained + next.gained,
    items: [...byLabel].map(([label, xp]) => ({ label, xp })).sort((a, b) => b.xp - a.xp),
    from: first.from,
    to: next.to,
    leveledUp: next.to.level > first.from.level,
    rankedUp: first.rankedUp || next.rankedUp,
    boosted: first.boosted || next.boosted,
    rank: next.rank,
  };
}

/** Writes that can change XP. After one succeeds, the app checks whether XP went up. */
const XP_ROUTES = [
  /^\/api\/checkins(\/|$)/,
  /^\/api\/weights(\/|$)/,
  /^\/api\/measurements(\/|$)/,
  /^\/api\/photos(\/|$)/,
  /^\/api\/workouts\/[^/]+\/(finish|sets)(\/|$)/,
  /^\/api\/workouts\/[^/]+$/,
];

/** Whether a request to this URL can change XP. Query strings are ignored. */
export const affectsXp = (url: string): boolean => {
  const path = url.split("?")[0];
  return XP_ROUTES.some((r) => r.test(path));
};

/** The browser event the API helper fires and the watcher listens for. */
export const XP_CHECK_EVENT = "gymtrack:xp-check";
