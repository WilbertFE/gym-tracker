import type { Checkin, WeightLog, WorkoutSession, WorkoutSet } from "@/lib/types";

/**
 * The getting started guide: a short chain of first steps. Each step is worked out from what the user
 * has already done, so it ticks itself and needs nothing stored. Finishing all of them earns a booster.
 */
export type GuideStepId = "checkin" | "firstSet" | "firstWorkout" | "weight";

export type GuideStep = {
  id: GuideStepId;
  title: string;
  /** What to do, in one line. */
  hint: string;
  done: boolean;
  /** Where to do it. */
  href: string;
};

export type GuideInput = {
  checkins: Pick<Checkin, "date">[];
  weights: Pick<WeightLog, "date">[];
  sessions: Pick<WorkoutSession, "id" | "ended_at">[];
  sets: Pick<WorkoutSet, "session_id">[];
};

/** A finished workout needs this many sets, the same rule as the XP for a workout. */
const MIN_SETS = 3;

export function guideSteps(input: GuideInput): GuideStep[] {
  const setsBySession = new Map<string, number>();
  for (const s of input.sets) setsBySession.set(s.session_id, (setsBySession.get(s.session_id) ?? 0) + 1);
  const finished = input.sessions.some((s) => s.ended_at !== null && (setsBySession.get(s.id) ?? 0) >= MIN_SETS);

  return [
    { id: "checkin", title: "Check in", hint: "Tell the app how you trained today.", done: input.checkins.length > 0, href: "/dashboard#daily-checkin" },
    { id: "firstSet", title: "Log your first set", hint: "Start a workout and log one set.", done: input.sets.length > 0, href: "/workouts" },
    { id: "firstWorkout", title: "Finish your first workout", hint: `Log at least ${MIN_SETS} sets, then tap Finish.`, done: finished, href: "/workouts" },
    { id: "weight", title: "Log your weight", hint: "One number, it starts your body chart.", done: input.weights.length > 0, href: "/body" },
  ];
}

export const guideDone = (steps: GuideStep[]): boolean => steps.every((s) => s.done);
