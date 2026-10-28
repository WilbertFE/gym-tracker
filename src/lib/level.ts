import "server-only";
import { summarizeBoosts, type BoostSummary } from "@/lib/boosters";
import { todayISO } from "@/lib/dates";
import { listBoosts } from "@/lib/repositories/boosts";
import { listCheckins } from "@/lib/repositories/checkins";
import { listMeasurements } from "@/lib/repositories/measurements";
import { listPhotos } from "@/lib/repositories/photos";
import { listWeights } from "@/lib/repositories/weights";
import { listAllSets, listSessions } from "@/lib/repositories/workouts";
import { computeXp, levelForXp, type LevelInfo, type XpSummary } from "@/lib/xp";

/** A user's XP, level and boosters, worked out from everything they have logged and used. */
export async function loadLevel(userId: string): Promise<{ xp: XpSummary; level: LevelInfo; boosts: BoostSummary }> {
  const [checkins, weights, measurements, photos, sessions, sets, boostRows] = await Promise.all([
    listCheckins(userId),
    listWeights(userId),
    listMeasurements(userId),
    listPhotos(userId),
    listSessions(userId),
    listAllSets(userId),
    listBoosts(userId),
  ]);
  const usedDays = boostRows.map((b) => b.day);
  const xp = computeXp({ checkins, weights, measurements, photos, sessions, sets, boostedDays: usedDays });
  const boosts = summarizeBoosts({
    workouts: xp.workouts,
    longestStreak: xp.longestStreak,
    usedDays,
    firstDate: xp.firstDate,
    today: todayISO(),
  });
  return { xp, level: levelForXp(xp.total), boosts };
}
