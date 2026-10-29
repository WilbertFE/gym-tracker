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
import { boosterGates, currentGate, gatesThrough, type GateStatus } from "@/lib/gates";
import { guideDone, guideSteps, type GuideStep } from "@/lib/guide";
import { muscleLevels, type MuscleLevel } from "@/lib/muscle-levels";
import { clearTrial, listClearedTrials } from "@/lib/repositories/trials";
import { bestTitle, titleStatuses, type TitleInput, type TitleStatus } from "@/lib/titles";
import { blockingTrial, levelCap, trialProgress, type TrialProgress } from "@/lib/trials";
import { getRecoveryEnabled } from "@/lib/unlock-state";
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
  /** Each muscle's own level. */
  muscles: MuscleLevel[];
  /** Every title with whether it is earned, and the one worn. */
  titles: TitleStatus[];
  title: string | null;
  /** The rank trial holding the level back, with progress, or null. */
  trial: TrialProgress | null;
};

/**
 * A user's XP, level, boosters and quests, worked out from everything they have logged and used.
 * Cached for the request, so the level card and the quests card on one page share a single load.
 */
export const loadLevel = cache(async (userId: string): Promise<GameState> => {
  const [checkins, weights, measurements, photos, sessions, sets, boostRows, exercises, trialRows, recovery] = await Promise.all([
    listCheckins(userId),
    listWeights(userId),
    listMeasurements(userId),
    listPhotos(userId),
    listSessions(userId),
    listAllSets(userId),
    listBoosts(userId),
    listExercises(userId),
    listClearedTrials(userId),
    getRecoveryEnabled(),
  ]);
  const today = todayISO();
  const exerciseMuscles = Object.fromEntries(exercises.map((e) => [e.id, e.primary_muscle]));
  const input = { checkins, weights, measurements, photos, sessions, sets, quests: { today, exerciseMuscles, recovery }, gates: { today } };
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
  const quests = buildQuestBoard({ checkins, weights, measurements, sessions, sets, exerciseMuscles, recovery }, today);
  const stats = computeStats({
    checkins,
    sessions,
    sets,
    exerciseMuscles,
    questsCompleted: xp.lines.find((l) => l.source === "quests")?.count ?? 0,
  });

  // Rank trials: from the Rep Machine rank up, the level waits at the rank's door until the trial is cleared.
  // Until the table exists (`available` false) nobody is held back.
  const cleared = new Set(trialRows.ids);
  const rawLevel = levelForXp(xp.total).level;
  let blocking = trialRows.available ? blockingTrial(rawLevel, cleared) : null;
  let trial: TrialProgress | null = null;
  if (blocking) {
    const finished = new Set(sessions.filter((s) => s.ended_at !== null).map((s) => s.id));
    const perSession = new Map<string, number>();
    for (const set of sets) perSession.set(set.session_id, (perSession.get(set.session_id) ?? 0) + 1);
    const workoutDates = sessions.filter((s) => finished.has(s.id) && (perSession.get(s.id) ?? 0) >= 3).map((s) => s.date);
    trial = trialProgress(blocking, workoutDates);
    if (trial.passed) {
      await clearTrial(userId, blocking.rank.id);
      cleared.add(blocking.rank.id);
      blocking = blockingTrial(rawLevel, cleared);
      trial = null;
    }
  }
  const levelInfo = levelForXp(xp.total, levelCap(blocking));

  const muscles = muscleLevels(sets, exercises);
  const titleInput: TitleInput = {
    workouts: xp.workouts,
    longestStreak: xp.longestStreak,
    guideDone: guideDone(guide),
    gatesCleared: gatesThrough(gateInput, today).filter((g) => g.cleared).length,
    questsCompleted: xp.lines.find((l) => l.source === "quests")?.count ?? 0,
    volumeKg: sets.reduce((sum, x) => sum + x.reps * x.weight_kg, 0),
    level: levelInfo.level,
    musclesTrained: muscles.filter((m) => m.weighted > 0).length,
  };

  return {
    xp,
    level: levelInfo,
    boosts,
    quests,
    guide,
    stats,
    gate: currentGate(gateInput, today),
    muscles,
    titles: titleStatuses(titleInput),
    title: bestTitle(titleInput),
    trial,
  };
});
