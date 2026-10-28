import { weeklyCoverage, workedMuscles } from "@/lib/coverage";
import { buildMuscleStats, type IntensityLevel } from "@/lib/muscle-intensity";
import type { MuscleGroup } from "@/lib/muscles";
import type { Exercise, WorkoutSession, WorkoutSet } from "@/lib/types";

export type WorkoutBody = {
  /** Heatmap level of every muscle for the workout's week, this workout included. */
  levels: Record<MuscleGroup, IntensityLevel>;
  /** Weighted sets behind each level. */
  scores: Record<MuscleGroup, number>;
  /** The muscles this workout worked. */
  worked: MuscleGroup[];
  /** Muscles with no work yet in the workout's week. */
  untouched: MuscleGroup[];
};

/**
 * What the body picture of a workout shows: each muscle colored by the week's total (the week the
 * workout belongs to, whether it is happening now or was a while ago), with the muscles this workout
 * worked picked out. The workout page and the share image both use this, so they always agree.
 */
export function workoutBody(input: {
  allSessions: WorkoutSession[];
  allSets: WorkoutSet[];
  session: WorkoutSession;
  /** Sets logged in this workout. */
  sets: WorkoutSet[];
  exercises: Exercise[];
}): WorkoutBody {
  const { allSessions, allSets, session, sets, exercises } = input;
  const week = buildMuscleStats({ sessions: allSessions, sets: allSets, exercises, today: session.date });
  const mine = buildMuscleStats({ sessions: [session], sets, exercises, today: session.date });

  return {
    levels: Object.fromEntries(week.map((s) => [s.muscle, s.weekly.level])) as Record<MuscleGroup, IntensityLevel>,
    scores: Object.fromEntries(week.map((s) => [s.muscle, s.weekly.score])) as Record<MuscleGroup, number>,
    worked: workedMuscles(mine).map((w) => w.muscle),
    untouched: weeklyCoverage(week).untrained.map((u) => u.muscle),
  };
}
