/** Single source for the absolute base URL (metadataBase, canonical, robots, sitemap). */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export const SITE_NAME = "GymTrack";
export const SITE_DESCRIPTION =
  "Personal gym tracker: workouts, body weight, check-ins, membership and a muscle heatmap.";

/** Routes that require authentication. Used by proxy.ts, robots.ts and tests. */
export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/workouts",
  "/body",
  "/membership",
  "/schedule",
  "/settings",
] as const;

/** API routes that do not require a session. */
export const PUBLIC_API_PREFIXES = ["/api/auth"] as const;
