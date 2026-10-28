import "server-only";
import { didTrain, type CheckinKind } from "@/lib/checkin-kind";
import { todayISO } from "@/lib/dates";
import { getCheckinByDate } from "@/lib/repositories/checkins";
import { getActiveSession } from "@/lib/repositories/workouts";

/** Why a new workout cannot be started, or null if it can. */
export type GateReason = "no_checkin" | "rest_day" | null;

export type WorkoutGate = {
  allowed: boolean;
  reason: GateReason;
  /** A workout is already in progress. Continuing it is always allowed. */
  hasActive: boolean;
};

export const GATE_MESSAGES = {
  no_checkin: "Check in for today, at the gym or as a home workout, to start a workout.",
  rest_day: "Today is marked as a rest day. Change your check-in to Gym or Home workout to start a workout.",
} as const;

/**
 * The rule for starting a workout: today's check-in must say you trained, at the
 * gym or at home. A workout that is already in progress can always be continued, so
 * changing the check-in afterwards never locks you out of it.
 */
export function decideGate(input: {
  hasActive: boolean;
  checkin: { kind: CheckinKind } | null;
}): WorkoutGate {
  if (input.hasActive) return { allowed: true, reason: null, hasActive: true };
  if (!input.checkin) return { allowed: false, reason: "no_checkin", hasActive: false };
  if (!didTrain(input.checkin.kind)) return { allowed: false, reason: "rest_day", hasActive: false };
  return { allowed: true, reason: null, hasActive: false };
}

/** Loads what the rule needs for today and applies it. */
export async function getWorkoutGate(userId: string): Promise<WorkoutGate> {
  const [active, checkin] = await Promise.all([
    getActiveSession(userId),
    getCheckinByDate(userId, todayISO()),
  ]);
  return decideGate({ hasActive: active !== null, checkin });
}
