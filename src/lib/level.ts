import "server-only";
import { cache } from "react";
import { summarizeBoosts, type BoostSummary } from "@/lib/boosters";
import { todayISO } from "@/lib/dates";
import { listBoosts } from "@/lib/repositories/boosts";
import { listCheckins } from "@/lib/repositories/checkins";
import { listExercises } from "@/lib/repositories/exercises";
import { listMeasurements } from "@/lib/repositories/measurements";
import { listPhotos } from "@/lib/repositories/photos";
import { listWeights } from "@/lib/repositories/weights";
import { listAllSets, listSessions } from "@/lib/repositories/workouts";
import { buildQuestBoard, type QuestBoard } from "@/lib/quests";
import { computeXp, levelForXp, type LevelInfo, type XpSummary } from "@/lib/xp";

export type GameState = { xp: XpSummary; level: LevelInfo; boosts: BoostSummary; quests: QuestBoard };

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
  const usedDays = boostRows.map((b) => b.day);
  const exerciseMuscles = Object.fromEntries(exercises.map((e) => [e.id, e.primary_muscle]));
  const xp = computeXp({
    checkins,
    weights,
    measurements,
    photos,
    sessions,
    sets,
    boostedDays: usedDays,
    quests: { today, exerciseMuscles },
  });
  const boosts = summarizeBoosts({
    workouts: xp.workouts,
    longestStreak: xp.longestStreak,
    usedDays,
    firstDate: xp.firstDate,
    today,
  });
  const quests = buildQuestBoard({ checkins, weights, measurements, sessions, sets, exerciseMuscles }, today);
  return { xp, level: levelForXp(xp.total), boosts, quests };
});
