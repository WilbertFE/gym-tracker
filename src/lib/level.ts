import "server-only";
import { cache } from "react";
import { boostersEarned, summarizeBoosts, type BoostSummary } from "@/lib/boosters";
import { todayISO } from "@/lib/dates";
import { listBoosts } from "@/lib/repositories/boosts";
import { listCheckins } from "@/lib/repositories/checkins";
import { listExercises } from "@/lib/repositories/exercises";
import { listMeasurements } from "@/lib/repositories/measurements";
import { listPhotos } from "@/lib/repositories/photos";
import { listWeights } from "@/lib/repositories/weights";
import { listAllSets, listSessions } from "@/lib/repositories/workouts";
import { boosterGates, currentGate, type GateStatus } from "@/lib/gates";
import { guideDone, guideSteps, type GuideStep } from "@/lib/guide";
import { buildQuestBoard, type QuestBoard } from "@/lib/quests";
import { computeStats, type Stat } from "@/lib/stats";
import { computeXp, levelForXp, type LevelInfo, type XpSummary } from "@/lib/xp";

export type GameState = {
  xp: XpSummary;
  level: LevelInfo;
  boosts: BoostSummary;
  quests: QuestBoard;
  /** The getting started steps, each ticked from what the user has done. */
  guide: GuideStep[];
  /** The five stats of the status window. */
  stats: Stat[];
  /** The weekly gate and how the fight stands. */
  gate: GateStatus;
};

/**
 * A user's XP, level, boosters and quests, worked out from everything they have logged and used.
 * Cached for the request, so the level card and the quests card on one page share a single load.
 */
export const loadLevel = cache(async (userId: string): Promise<GameState> => {
  const [checkins, weights, measurements, photos, sessions, sets, boostRows, exercises] = await Promise.all([
    listCheckins(userId),
    listWeights(userId),
    listMeasurements(userId),
    listPhotos(userId),
    listSessions(userId),
    listAllSets(userId),
    listBoosts(userId),
    listExercises(userId),
  ]);
  const today = todayISO();
  const exerciseMuscles = Object.fromEntries(exercises.map((e) => [e.id, e.primary_muscle]));
  const input = { checkins, weights, measurements, photos, sessions, sets, quests: { today, exerciseMuscles }, gates: { today } };
  const gateInput = { sessions, sets };
  const gateBoosters = boosterGates(gateInput, today);

  // Boosters beyond the number earned are ignored (the oldest ones are kept), so rows added to the
  // table by hand cannot double anything. The API already refuses them, this covers the database.
  const guide = guideSteps({ checkins, weights, sessions, sets });
  const withoutBoosts = computeXp(input);
  const earned = boostersEarned({
    workouts: withoutBoosts.workouts,
    longestStreak: withoutBoosts.longestStreak,
    guideDone: guideDone(guide),
    gateBoosters,
  }).total;
  const usedDays = boostRows.map((b) => b.day).sort().slice(0, earned);
  const xp = computeXp({ ...input, boostedDays: usedDays });
  const boosts = summarizeBoosts({
    workouts: xp.workouts,
    longestStreak: xp.longestStreak,
    guideDone: guideDone(guide),
    gateBoosters,
    usedDays,
    firstDate: xp.firstDate,
    today,
  });
  const quests = buildQuestBoard({ checkins, weights, measurements, sessions, sets, exerciseMuscles }, today);
  const stats = computeStats({
    checkins,
    sessions,
    sets,
    exerciseMuscles,
    questsCompleted: xp.lines.find((l) => l.source === "quests")?.count ?? 0,
  });
  return { xp, level: levelForXp(xp.total), boosts, quests, guide, stats, gate: currentGate(gateInput, today) };
});
