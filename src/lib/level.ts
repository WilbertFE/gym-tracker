import "server-only";
import { listCheckins } from "@/lib/repositories/checkins";
import { listMeasurements } from "@/lib/repositories/measurements";
import { listPhotos } from "@/lib/repositories/photos";
import { listWeights } from "@/lib/repositories/weights";
import { listAllSets, listSessions } from "@/lib/repositories/workouts";
import { computeXp, levelForXp, type LevelInfo, type XpSummary } from "@/lib/xp";

/** A user's XP and level, worked out from everything they have logged. */
export async function loadLevel(userId: string): Promise<{ xp: XpSummary; level: LevelInfo }> {
  const [checkins, weights, measurements, photos, sessions, sets] = await Promise.all([
    listCheckins(userId),
    listWeights(userId),
    listMeasurements(userId),
    listPhotos(userId),
    listSessions(userId),
    listAllSets(userId),
  ]);
  const xp = computeXp({ checkins, weights, measurements, photos, sessions, sets });
  return { xp, level: levelForXp(xp.total) };
}
