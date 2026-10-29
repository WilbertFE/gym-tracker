import { itemById } from "@/lib/items";
import { getCheckinByDate } from "@/lib/repositories/checkins";
import { listMemberships } from "@/lib/repositories/memberships";
import { listAllSets, listSessions } from "@/lib/repositories/workouts";
import { loadLevel } from "@/lib/level";
import { buildShareCard, workoutLocation } from "@/lib/share";
import type { Exercise, WorkoutSession, WorkoutSet } from "@/lib/types";
import type { WeightUnit } from "@/lib/units";
import { workoutBody } from "@/lib/workout-body";
import { ShareWorkout } from "./share-workout";

type WorkoutShareProps = {
  userId: string;
  session: WorkoutSession;
  sets: WorkoutSet[];
  exercises: Exercise[];
  unit: WeightUnit;
  /** Open the dialog as soon as the page loads, for the moment a workout has just been finished. */
  shareOnLoad: boolean;
};

/**
 * Gathers what the share image needs (the week's muscles, where you trained, your rank) and hands it
 * to the dialog. It loads after the rest of the page, so it never slows the workout down.
 */
export async function WorkoutShare({ userId, session, sets, exercises, unit, shareOnLoad }: WorkoutShareProps) {
  const [allSessions, allSets, checkin, [membership], { level, collection }] = await Promise.all([
    listSessions(userId),
    listAllSets(userId),
    getCheckinByDate(userId, session.date),
    listMemberships(userId),
    loadLevel(userId),
  ]);

  const card = buildShareCard({
    session,
    sets,
    exercises,
    unit,
    body: workoutBody({ allSessions, allSets, session, sets, exercises }),
    location: workoutLocation({
      kind: checkin?.kind ?? null,
      gymName: membership?.gym_name ?? null,
      gymLocation: membership?.location ?? null,
    }),
    progress: { level: level.level, rank: level.rank },
  });

  // The share looks from chests the user owns, and the one they wear (it is picked first).
  const ownedLooks = collection.owned.map((id) => itemById(id)).filter((i) => i?.slot === "look").map((i) => i!.value);
  const wornLook = collection.equipment.look ? (itemById(collection.equipment.look)?.value ?? null) : null;

  return <ShareWorkout card={card} date={session.date} defaultOpen={shareOnLoad} ownedLooks={ownedLooks} wornLook={wornLook} />;
}
