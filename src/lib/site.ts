/** Single source for the absolute base URL (metadataBase, canonical, robots, sitemap). */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export const SITE_NAME = "Muscles Leveling";
export const SITE_DESCRIPTION =
  "Level up your training: log workouts, earn XP, climb ranks, finish quests and watch your muscles grow.";

/** Routes that require authentication. Used by proxy.ts, robots.ts and tests. */
export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/workouts",
  "/body",
  "/membership",
  "/schedule",
  "/settings",
  "/leaderboard",
  "/guide",
] as const;

/** API routes that do not require a session. */
export const PUBLIC_API_PREFIXES = ["/api/auth"] as const;
