import { NextResponse } from "next/server";
import { guard } from "@/lib/api";
import { LEADERBOARD } from "@/lib/leaderboard";
import { syncLeaderboardEntry } from "@/lib/leaderboard-sync";
import { syncProfileSnapshot } from "@/lib/profile-sync";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Recomputes your own board score and the snapshot your profile shows. The app calls it after XP changes. It does nothing if you have not
 * joined (204), and is limited to once every few seconds per user.
 */
export async function POST() {
  const g = await guard("leaderboard-sync", { write: false });
  if (g.error) return g.error;

  const limit = rateLimit(`leaderboard-sync:${g.userId}`, 1, LEADERBOARD.syncThrottleMs);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Slow down." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  await syncLeaderboardEntry(g.userId);
  // The profile others can open is brought up to date at the same time. It does nothing without a profile.
  await syncProfileSnapshot(g.userId);
  return new NextResponse(null, { status: 204 });
}
