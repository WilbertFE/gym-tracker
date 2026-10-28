import { didTrain } from "@/lib/checkin-kind";
import { longestStreak } from "@/lib/streak";
import type { Checkin, WorkoutSession, WorkoutSet } from "@/lib/types";

/**
 * The five stats on the status window. They are worked out from what the user has logged, grow on their
 * own and are never spent. Each rises with a different habit, so the shape of the radar tells you what
 * kind of trainer you are. The curves are logarithmic: the first workouts move a stat a lot, and later
 * gains take more, so a veteran is stronger than a beginner but nobody runs off the chart.
 */
export type StatId = "strength" | "endurance" | "vitality" | "agility" | "discipline";

export type Stat = {
  id: StatId;
  name: string;
  value: number;
  /** What raises it, in a few words. */
  raisedBy: string;
  /** The numbers behind it, for the line under the bar. */
  detail: string;
};

export type StatsInput = {
  checkins: (Pick<Checkin, "date" | "kind">)[];
  sessions: Pick<WorkoutSession, "id" | "ended_at" | "duration_minutes">[];
  sets: Pick<WorkoutSet, "session_id" | "exercise_id" | "reps" | "weight_kg">[];
  /** Primary muscle of each exercise, by id. Without it agility counts exercises only. */
  exerciseMuscles?: Record<string, string>;
  /** Quests finished so far (the count from the XP breakdown). */
  questsCompleted: number;
};

/** 10 times the base 2 logarithm of 1 + x, rounded down: 0 for nothing, about 33 for 9, 100 for about 1,000. */
const curve = (x: number): number => Math.floor(10 * Math.log2(1 + Math.max(0, x)));

export const STAT_NAMES: Record<StatId, string> = {
  strength: "Strength",
  endurance: "Endurance",
  vitality: "Vitality",
  agility: "Agility",
  discipline: "Discipline",
};

export function computeStats(input: StatsInput): Stat[] {
  const volumeKg = input.sets.reduce((sum, s) => sum + s.reps * s.weight_kg, 0);
  const totalSets = input.sets.length;
  const minutes = input.sessions.reduce((sum, s) => sum + (s.ended_at !== null ? (s.duration_minutes ?? 0) : 0), 0);

  const checkinDates = new Set(input.checkins.map((c) => c.date));
  const trainedDays = new Set(input.checkins.filter((c) => didTrain(c.kind)).map((c) => c.date)).size;
  const streak = longestStreak([...checkinDates]);

  const exercises = new Set(input.sets.map((s) => s.exercise_id));
  const muscles = new Set(
    input.sets.map((s) => input.exerciseMuscles?.[s.exercise_id]).filter((m): m is string => Boolean(m)),
  );

  const make = (id: StatId, value: number, raisedBy: string, detail: string): Stat => ({
    id,
    name: STAT_NAMES[id],
    value,
    raisedBy,
    detail,
  });

  return [
    make("strength", curve(volumeKg / 1000), "Lifting more weight, for more reps", `${Math.round(volumeKg).toLocaleString("en-US")} kg lifted in total`),
    make("endurance", curve((totalSets + minutes / 3) / 10), "Sets logged and time spent training", `${totalSets} sets, ${Math.round(minutes)} minutes`),
    make("vitality", curve((checkinDates.size + streak * 2) / 5), "Checking in often and keeping a streak", `${checkinDates.size} check-ins, best streak ${streak} days`),
    make("agility", Math.floor(muscles.size * 4 + Math.min(exercises.size, 40) * 1.5), "Training many different muscles and exercises", `${muscles.size} muscle groups, ${exercises.size} exercises`),
    make("discipline", curve((trainedDays * 2 + input.questsCompleted) / 5), "Training days and finished quests", `${trainedDays} training days, ${input.questsCompleted} quests`),
  ];
}

/** The total of all five, a single number for a quick comparison. */
export const totalStats = (stats: Stat[]): number => stats.reduce((sum, s) => sum + s.value, 0);
