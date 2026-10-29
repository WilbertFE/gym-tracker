/**
 * Titles: earned for milestones, shown beside the nickname on the leaderboard and on the status window.
 * They are worked out from the same data as XP, nothing is stored, and the one shown is the most
 * prestigious one earned (the catalog is ordered from the top down).
 */
export type TitleInput = {
  /** Finished workouts that count. */
  workouts: number;
  longestStreak: number;
  guideDone: boolean;
  gatesCleared: number;
  questsCompleted: number;
  volumeKg: number;
  level: number;
  /** Muscle groups that have been trained at all. */
  musclesTrained: number;
};

export type Title = {
  id: string;
  name: string;
  /** What earns it, in plain words. */
  how: string;
  earned: (input: TitleInput) => boolean;
};

export const ALL_MUSCLES = 16;

/** Most prestigious first. */
export const TITLES: readonly Title[] = [
  { id: "legend", name: "Living Legend", how: "Reach level 250", earned: (i) => i.level >= 250 },
  { id: "centurion", name: "Centurion", how: "Reach level 100", earned: (i) => i.level >= 100 },
  { id: "heavy", name: "Heavy Lifter", how: "Lift 100,000 kg in total", earned: (i) => i.volumeKg >= 100_000 },
  { id: "rounded", name: "Well Rounded", how: "Train all 16 muscle groups", earned: (i) => i.musclesTrained >= ALL_MUSCLES },
  { id: "breaker", name: "Gate Breaker", how: "Clear 5 weekly gates", earned: (i) => i.gatesCleared >= 5 },
  { id: "unbroken", name: "Unbroken", how: "Check in 30 days in a row", earned: (i) => i.longestStreak >= 30 },
  { id: "regular", name: "Iron Regular", how: "Finish 50 workouts", earned: (i) => i.workouts >= 50 },
  { id: "runner", name: "Quest Runner", how: "Finish 50 quests", earned: (i) => i.questsCompleted >= 50 },
  { id: "firststeps", name: "First Steps", how: "Finish the getting started guide", earned: (i) => i.guideDone },
];

export type TitleStatus = { id: string; name: string; how: string; earned: boolean };

/** Every title with whether it is earned, most prestigious first. */
export const titleStatuses = (input: TitleInput): TitleStatus[] =>
  TITLES.map((t) => ({ id: t.id, name: t.name, how: t.how, earned: t.earned(input) }));

/** The title to show: the most prestigious earned, or null. */
export const bestTitle = (input: TitleInput): string | null => TITLES.find((t) => t.earned(input))?.name ?? null;
