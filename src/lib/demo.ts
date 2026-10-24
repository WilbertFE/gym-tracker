/**
 * Demo mode lets the app run with in-memory dummy data and no Supabase project.
 * It needs an explicit opt-in and is always off in production builds.
 */
export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";

export function isDemoMode() {
  return (
    process.env.NEXT_PUBLIC_DEMO_MODE === "true" &&
    process.env.NODE_ENV !== "production"
  );
}
