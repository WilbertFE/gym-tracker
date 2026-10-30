import "server-only";
import { cache } from "react";
import { boostersEarned, summarizeBoosts, type BoostSummary } from "@/lib/boosters";
import { chestState, earnedChests, gateChests, seasonChests, type AvailableChest, type Chest, type Opening } from "@/lib/chests";
import { itemById, NO_EQUIPMENT, SLOTS, type Equipment } from "@/lib/items";
import { todayISO } from "@/lib/dates";
import { listBoosts } from "@/lib/repositories/boosts";
import type { ProfileActivity } from "@/lib/profile";
import { withBodyweightLoad } from "@/lib/load";
import { getEquipment, listExtraChests, listOpenings } from "@/lib/repositories/chests";
import { listCheckins } from "@/lib/repositories/checkins";
import { listExercises } from "@/lib/repositories/exercises";
import { listPhotos } from "@/lib/repositories/photos";
import { listWeights } from "@/lib/repositories/weights";
import { listAllSets, listSessions } from "@/lib/repositories/workouts";
import { buildBattle, type Battle } from "@/lib/battle/engine";
import type { SkillEffects } from "@/lib/battle/skills";
import { boosterGates, currentGate, currentSeason, dailyDamage, gatesThrough, seasonsThrough, weakPointFor, type GateInput, type GateStatus, type Power } from "@/lib/gates";
import { friendChests, weeklyDamage, type BossMember } from "@/lib/friends";
import { loadFriendGroup } from "@/lib/friends-server";
import { guideDone, guideSteps, type GuideStep } from "@/lib/guide";
import { muscleLevels, type MuscleLevel } from "@/lib/muscle-levels";
import { clearTrial, listClearedTrials } from "@/lib/repositories/trials";
import { bestTitle, titleStatuses, type TitleInput, type TitleStatus } from "@/lib/titles";
import { blockingTrial, levelCap, trialProgress, type TrialProgress } from "@/lib/trials";
import { getRecoveryEnabled } from "@/lib/unlock-state";
import { buildQuestBoard, QUEST_START_DATE, questRewards, type QuestBoard } from "@/lib/quests";
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
  /** The gate as a turn based fight, or null while this gate's rank has no monster. */
  battle: Battle | null;
  /** This month's season boss, or null before the seasons start. */
  season: GateStatus | null;
  /** The season boss as a turn based fight. */
  seasonBattle: Battle | null;
  /** What the logger needs to show a hit right after a set: null while this gate has no monster. */
  fight: FightSummary | null;
  /** Each muscle's own level. */
  muscles: MuscleLevel[];
  /** Every title with whether it is earned, and the one worn. */
  titles: TitleStatus[];
  title: string | null;
  /** The rank trial holding the level back, with progress, or null. */
  trial: TrialProgress | null;
  /**
   * Quest chests: the ones that can be opened now, the ones that ran out, and everything opened so far.
   * `enabled` is false until the chests migration has run, and then no chests are offered at all.
   */
  chests: { enabled: boolean; available: AvailableChest[]; expired: Chest[]; openings: Opening[] };
  /** Friends: whether the feature is set up, your own card (null until you open the Friends page), and your group for the weekly boss. */
  friends: { available: boolean; card: { code: string; name: string; level: number } | null; members: BossMember[] };
  /** The cosmetic items owned (ids) and the ones worn, one per slot. */
  collection: { owned: string[]; equipment: Equipment };
  /** Plain counts of what the user has done, for the profile. */
  activity: ProfileActivity;
};

/** The small part of the fight a workout screen needs to show what a set just did to the monster. */
export type FightSummary = {
  monster: string;
  weekStart: string;
  /** The monster's HP left now. 0 once it has fallen. */
  hpLeft: number;
  power: Power;
  /** The muscle this week's monster is weak against, and the exercises' primary muscles, so a logged set can tell if it hit the weak point. */
  weakMuscle: string;
  /** The skills unlocked this week, and how many sets and which training days the week has so far, for the skills that count them. */
  skills: SkillEffects;
  setsThisWeek: number;
  trainingDays: string[];
};

/**
 * A user's XP, level, boosters and quests, worked out from everything they have logged and used.
 * Cached for the request, so the level card and the quests card on one page share a single load.
 */
export const loadLevel = cache(async (userId: string): Promise<GameState> => {
  const [checkins, weights, photos, sessions, loggedSets, boostRows, exercises, trialRows, recovery, openingRows, wornRaw, extraChests] = await Promise.all([
    listCheckins(userId),
    listWeights(userId),
    listPhotos(userId),
    listSessions(userId),
    listAllSets(userId),
    listBoosts(userId),
    listExercises(userId),
    listClearedTrials(userId),
    getRecoveryEnabled(),
    listOpenings(userId),
    getEquipment(userId),
    listExtraChests(userId),
  ]);
  const today = todayISO();
  // A bodyweight exercise counts its share of the body weight (and what was added) as its load, for volume, strength and gates.
  const sets = withBodyweightLoad(loggedSets, exercises, sessions, weights);
  const exerciseMuscles = Object.fromEntries(exercises.map((e) => [e.id, e.primary_muscle]));
  // A repeat from a chest pays a little XP, on the day the chest was opened.
  const chestBonuses = openingRows.openings.filter((o) => o.duplicate && o.bonus_xp > 0).map((o) => ({ date: o.opened_on, xp: o.bonus_xp }));
  const baseInput = { checkins, weights, photos, sessions, sets, quests: { today, exerciseMuscles, recovery }, chestBonuses };
  // The level that unlocks a week's skills: what you had on its first day, from every source of XP except the gates, so a
  // gate can never unlock the skill that would clear it.
  const levelByDate = Object.entries(computeXp(baseInput).byDate).sort(([a], [b]) => a.localeCompare(b));
  const levelBefore = (weekStart: string): number => {
    let total = 0;
    for (const [date, earned] of levelByDate) {
      if (date >= weekStart) break;
      total += earned;
    }
    return levelForXp(total).level;
  };
  const gateInput: GateInput = { sessions, sets, exerciseMuscles, levelBefore };
  // The XP for a cleared gate is worked out from the very same input as the gate card, so the two always agree.
  const input = { ...baseInput, gates: { today, input: gateInput } };
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
  const questInput = { checkins, weights, sessions, sets, exerciseMuscles, recovery };
  const quests = buildQuestBoard(questInput, today);

  // Chests: one for every day or week whose quests were all finished and every gate cleared, minus the opened and the expired.
  const chestsEarned = new Map<string, Chest>();
  const openedIds = new Set(openingRows.openings.map((o) => o.chest_id));
  // The friends boss: your damage is worked out live, your friends' is what the server stored the last time they were in the app.
  const friends = await loadFriendGroup(userId, { weeks: weeklyDamage(dailyDamage(gateInput)), level: levelForXp(xp.total).level }, today);
  const earnedFromPlay = [
    ...earnedChests(questRewards(questInput, { start: QUEST_START_DATE, today }).rewards),
    ...gateChests(gatesThrough(gateInput, today)),
    ...seasonChests(seasonsThrough(gateInput, today)),
    ...friendChests(friends.members, today, openedIds),
  ];
  for (const chest of [...earnedFromPlay, ...extraChests]) {
    chestsEarned.set(chest.id, chest);
  }
  const chestInfo = openingRows.available ? chestState([...chestsEarned.values()], openedIds, today) : { available: [], expired: [] };

  // Only items that are owned, exist and fit their slot count as worn.
  const owned = [...new Set(openingRows.openings.map((o) => o.item_id))];
  const equipment: Equipment = { ...NO_EQUIPMENT };
  for (const slot of SLOTS) {
    const id = wornRaw[slot.id];
    const item = id ? itemById(id) : null;
    if (item && item.slot === slot.id && owned.includes(item.id)) equipment[slot.id] = item.id;
  }
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

  const gate = currentGate(gateInput, today);
  const exerciseNames = Object.fromEntries(exercises.map((e) => [e.id, e.name]));
  const season = currentSeason(gateInput, today);
  // The two fights are only needed by the pages that show or log into one, and building each replays the week or the month set by
  // set. They are built the first time they are read, so a page that only wants your level or your quests never pays for them.
  const once = <T,>(make: () => T): (() => T) => {
    let made: { value: T } | null = null;
    return () => (made ??= { value: make() }).value;
  };
  const getBattle = once(() => buildBattle({ gate: gate.gate, gateInput, names: exerciseNames, stats, today }));
  const getSeasonBattle = once(() => (season ? buildBattle({ gate: season.gate, gateInput, names: exerciseNames, stats, today }) : null));
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
    gate: gate,
    get battle() {
      return getBattle();
    },
    season,
    get seasonBattle() {
      return getSeasonBattle();
    },
    get fight() {
      const battle = getBattle();
      return battle ? { monster: battle.monster.name, weekStart: gate.gate.weekStart, hpLeft: gate.hpLeft, power: battle.hero.power, weakMuscle: weakPointFor(gate.gate.weekStart), skills: battle.skills, setsThisWeek: battle.turns.length, trainingDays: [...new Set(battle.turns.map((t) => t.date))] } : null;
    },
    muscles,
    titles: titleStatuses(titleInput),
    title: bestTitle(titleInput),
    trial,
    chests: { enabled: openingRows.available, ...chestInfo, openings: openingRows.openings },
    friends,
    collection: { owned, equipment },
    activity: {
      workouts: titleInput.workouts,
      longestStreak: titleInput.longestStreak,
      questsCompleted: titleInput.questsCompleted,
      gatesCleared: titleInput.gatesCleared,
      volumeKg: Math.round(titleInput.volumeKg),
    },
  };
});
