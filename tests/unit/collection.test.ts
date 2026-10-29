import { beforeEach, describe, expect, it, vi } from "vitest";
import { levelForWeightedSets, muscleLevels, setsForMuscleLevel, strongestMuscle } from "@/lib/muscle-levels";
import { buildDayMetrics, buildQuestBoard, needsRecovery, questRewards, RECOVERY_QUEST, type QuestInput } from "@/lib/quests";
import { ALL_MUSCLES, bestTitle, TITLES, titleStatuses, type TitleInput } from "@/lib/titles";
import { bestWindow, blockingTrial, levelCap, trialFor, trialProgress, TRIAL_FROM_LEVEL, TRIAL_RANKS } from "@/lib/trials";
import { RANKS } from "@/lib/ranks";
import { levelForXp, xpForLevel } from "@/lib/xp";
import { resetRateLimits } from "@/lib/rate-limit";
import { resetStores } from "@/lib/repositories/memory/store";

vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");

import { GET as getBoard } from "@/app/api/leaderboard/route";
import { PUT as join } from "@/app/api/leaderboard/profile/route";

const ex = (id: string, primary_muscle: never, secondary_muscles: never[] = []) => ({ id, primary_muscle, secondary_muscles });

describe("muscle levels", () => {
  it("needs 2 (L - 1) squared weighted sets for level L", () => {
    expect([1, 2, 3, 5, 10].map(setsForMuscleLevel)).toEqual([0, 2, 8, 32, 162]);
    for (let level = 1; level <= 60; level++) {
      expect(levelForWeightedSets(setsForMuscleLevel(level))).toBe(level);
      if (level > 1) expect(levelForWeightedSets(setsForMuscleLevel(level) - 0.5)).toBe(level - 1);
    }
  });

  it("covers all 16 muscles, all level 1 and untrained at the start", () => {
    const levels = muscleLevels([], []);
    expect(levels).toHaveLength(16);
    expect(levels.every((m) => m.level === 1 && m.weighted === 0 && m.progress === 0)).toBe(true);
    expect(strongestMuscle(levels)).toBeNull();
  });

  it("counts a primary set fully and a secondary set by half", () => {
    const exercises = [ex("bench", "chest" as never, ["triceps"] as never[])];
    const levels = muscleLevels(Array.from({ length: 8 }, () => ({ exercise_id: "bench" })), exercises);
    const chest = levels.find((m) => m.muscle === "chest")!;
    const triceps = levels.find((m) => m.muscle === "triceps")!;
    expect(chest.weighted).toBe(8);
    expect(chest.level).toBe(3);
    expect(triceps.weighted).toBe(4);
    expect(triceps.level).toBe(2);
    expect(strongestMuscle(levels)?.muscle).toBe("chest");
  });

  it("ignores sets of exercises that are gone, and reports sets to the next level", () => {
    const levels = muscleLevels([{ exercise_id: "gone" }], []);
    expect(levels.every((m) => m.weighted === 0)).toBe(true);
    const chest = muscleLevels([{ exercise_id: "b" }], [ex("b", "chest" as never)]).find((m) => m.muscle === "chest")!;
    expect(chest.toNext).toBe(1);
  });
});

describe("titles", () => {
  const none: TitleInput = { workouts: 0, longestStreak: 0, guideDone: false, gatesCleared: 0, questsCompleted: 0, volumeKg: 0, level: 1, musclesTrained: 0 };

  it("has none to start, and each is earned by its own milestone", () => {
    expect(bestTitle(none)).toBeNull();
    expect(bestTitle({ ...none, guideDone: true })).toBe("First Steps");
    expect(bestTitle({ ...none, workouts: 50 })).toBe("Iron Regular");
    expect(bestTitle({ ...none, longestStreak: 30 })).toBe("Unbroken");
    expect(bestTitle({ ...none, gatesCleared: 5 })).toBe("Gate Breaker");
    expect(bestTitle({ ...none, musclesTrained: ALL_MUSCLES })).toBe("Well Rounded");
    expect(bestTitle({ ...none, volumeKg: 100_000 })).toBe("Heavy Lifter");
    expect(bestTitle({ ...none, level: 100 })).toBe("Centurion");
    expect(bestTitle({ ...none, questsCompleted: 50 })).toBe("Quest Runner");
  });

  it("wears the most prestigious earned title", () => {
    expect(bestTitle({ ...none, guideDone: true, workouts: 80, level: 120 })).toBe("Centurion");
    expect(bestTitle({ ...none, level: 300, workouts: 500 })).toBe("Living Legend");
  });

  it("lists every title with whether it is earned, with unique ids and no em dash", () => {
    const list = titleStatuses({ ...none, guideDone: true });
    expect(list).toHaveLength(TITLES.length);
    expect(list.filter((t) => t.earned).map((t) => t.id)).toEqual(["firststeps"]);
    expect(new Set(TITLES.map((t) => t.id)).size).toBe(TITLES.length);
    for (const t of TITLES) expect(`${t.name} ${t.how}`).not.toContain("—");
  });
});

describe("rank trials", () => {
  it("start at the Rep Machine rank and above, each with a goal", () => {
    expect(TRIAL_RANKS[0].name).toBe("Rep Machine");
    expect(TRIAL_RANKS.every((r) => r.minLevel >= TRIAL_FROM_LEVEL)).toBe(true);
    expect(trialFor(RANKS[0])).toBeNull();
    for (const rank of TRIAL_RANKS) {
      const t = trialFor(rank)!;
      expect(t.workouts).toBeGreaterThanOrEqual(3);
      expect(t.workouts).toBeLessThanOrEqual(6);
      expect(t.days).toBeGreaterThanOrEqual(7);
    }
  });

  it("finds the best burst of workouts in a window", () => {
    expect(bestWindow([], 7)).toBe(0);
    expect(bestWindow(["2026-11-01", "2026-11-03", "2026-11-07"], 7)).toBe(3);
    expect(bestWindow(["2026-11-01", "2026-11-03", "2026-11-09"], 7)).toBe(2);
    expect(bestWindow(["2026-11-09", "2026-11-01", "2026-11-03"], 7)).toBe(2);
  });

  it("passes when enough workouts fall in the window", () => {
    const trial = trialFor(TRIAL_RANKS[0])!;
    const dates = ["2026-11-01", "2026-11-03", "2026-11-05"];
    expect(trialProgress(trial, dates)).toMatchObject({ passed: true, best: 3 });
    expect(trialProgress(trial, dates.slice(0, 2))).toMatchObject({ passed: false, best: 2 });
  });

  it("holds the level one short of the rank until the trial is cleared", () => {
    const rank = TRIAL_RANKS[0];
    expect(blockingTrial(rank.minLevel - 1, new Set())).toBeNull();
    const blocking = blockingTrial(rank.minLevel, new Set())!;
    expect(blocking.rank.id).toBe(rank.id);
    expect(levelCap(blocking)).toBe(rank.minLevel - 1);
    expect(blockingTrial(rank.minLevel, new Set([rank.id]))).toBeNull();
    expect(levelCap(null)).toBeNull();
  });

  it("holds the level with its bar one XP short, and the XP keeps counting", () => {
    const far = xpForLevel(30);
    const held = levelForXp(far, 24);
    expect(held.level).toBe(24);
    expect(held.held).toBe(true);
    expect(held.toNext).toBe(1);
    expect(held.total).toBe(far);
    expect(held.progress).toBeLessThan(1);
    expect(held.progress).toBeGreaterThan(0.9);
    expect(held.rank.name).toBe("Plate Mover");
    const free = levelForXp(far, null);
    expect(free.level).toBe(30);
    expect(free.held).toBe(false);
    expect(levelForXp(xpForLevel(10), 24).held).toBe(false);
  });

  it("blocks the first uncleared trial, in order", () => {
    const [first, second] = TRIAL_RANKS;
    expect(blockingTrial(second.minLevel, new Set())!.rank.id).toBe(first.id);
    expect(blockingTrial(second.minLevel, new Set([first.id]))!.rank.id).toBe(second.id);
  });
});

describe("the comeback quest", () => {
  const START = "2026-10-28";
  const empty: QuestInput = { checkins: [], weights: [], measurements: [], sessions: [], sets: [], recovery: true };
  const checkin = (date: string) => ({ date, kind: "gym" as const });

  it("does not appear for a new account or after a good day", () => {
    const m = buildDayMetrics({ ...empty, checkins: [checkin("2026-11-01")] });
    expect(needsRecovery("2026-11-02", m, START)).toBe(false);
    expect(needsRecovery("2026-11-01", m, START)).toBe(false);
  });

  it("appears the day after a day with no daily quest finished", () => {
    const m = buildDayMetrics({ ...empty, checkins: [checkin("2026-10-30"), checkin("2026-11-03")] });
    // 31 Oct and 1 Nov were quiet days, so the days after them carry a comeback quest.
    expect(needsRecovery("2026-11-01", m, START)).toBe(true);
    expect(needsRecovery("2026-11-02", m, START)).toBe(true);
    // 3 Nov had a check-in, a finished daily quest, so 4 Nov does not.
    expect(needsRecovery("2026-11-04", m, START)).toBe(false);
    expect(needsRecovery("2026-11-05", m, START)).toBe(true);
  });

  it("is not for days before the quest start", () => {
    const m = buildDayMetrics({ ...empty, checkins: [checkin("2026-10-01")] });
    expect(needsRecovery("2026-10-28", m, START)).toBe(false);
  });

  it("pays its XP once done, and never takes XP away", () => {
    const sets = Array.from({ length: 5 }, () => ({ session_id: "w" }));
    const input: QuestInput = {
      ...empty,
      checkins: [checkin("2026-10-30")],
      sessions: [{ id: "w", date: "2026-11-03", ended_at: null }],
      sets,
    };
    const { rewards } = questRewards(input, { start: START, today: "2026-11-03" });
    expect(rewards.filter((r) => r.kind === "recovery")).toEqual([{ date: "2026-11-03", xp: RECOVERY_QUEST.xp, kind: "recovery" }]);
    expect(rewards.every((r) => r.xp > 0)).toBe(true);
  });

  it("pays nothing when switched off, and is left out of the board", () => {
    const sets = Array.from({ length: 5 }, () => ({ session_id: "w" }));
    const off: QuestInput = {
      ...empty,
      recovery: false,
      checkins: [checkin("2026-10-30")],
      sessions: [{ id: "w", date: "2026-11-03", ended_at: null }],
      sets,
    };
    expect(questRewards(off, { start: START, today: "2026-11-03" }).rewards.some((r) => r.kind === "recovery")).toBe(false);
    expect(buildQuestBoard(off, "2026-11-03").recovery).toBeNull();
  });

  it("is on the board when it applies, and is not part of the daily bonus", () => {
    const input: QuestInput = { ...empty, checkins: [checkin("2026-10-30"), checkin("2026-11-03")] };
    const board = buildQuestBoard(input, "2026-11-03");
    expect(board.recovery?.quest.id).toBe("d-recovery");
    expect(board.recovery?.done).toBe(false);
    expect(board.daily).toHaveLength(3);
  });

  it("keeps its words kind, with no em dash", () => {
    expect(`${RECOVERY_QUEST.title} ${RECOVERY_QUEST.hint}`).not.toContain("—");
  });
});

describe("the title on the leaderboard", () => {
  beforeEach(() => {
    resetStores();
    resetRateLimits();
  });

  it("shows the title of a sample player and carries your own", async () => {
    const put = (name: string) => join(new Request("http://localhost/api/leaderboard/profile", { method: "PUT", body: JSON.stringify({ display_name: name }) }));
    expect((await put("Titled Lifter")).status).toBe(200);
    const { data } = await (await getBoard(new Request("http://localhost/api/leaderboard"))).json();
    expect(data.rows.some((r: { title: string | null }) => r.title === "Iron Regular")).toBe(true);
    expect(data.me).toHaveProperty("title");
  });
});
