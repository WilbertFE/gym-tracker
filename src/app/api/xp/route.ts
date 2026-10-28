import { NextResponse } from "next/server";
import { guard } from "@/lib/api";
import { loadLevel } from "@/lib/level";
import type { XpSnapshot } from "@/lib/xp-diff";

/** The user's XP, level and rank, with the XP per source. The pop-up compares two of these. */
export async function GET() {
  const g = await guard("xp", { write: false });
  if (g.error) return g.error;

  const { xp, level, boosts } = await loadLevel(g.userId);
  const data: XpSnapshot = {
    userId: g.userId,
    total: xp.total,
    level: level.level,
    progress: level.progress,
    rank: level.rank,
    boostedToday: boosts.activeToday,
    lines: xp.lines.map(({ source, label, xp: amount }) => ({ source, label, xp: amount })),
  };
  return NextResponse.json({ data });
}
