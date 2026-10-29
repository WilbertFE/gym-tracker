import { Panel } from "@/components/panel";
import { getCurrentUserId } from "@/lib/auth";
import { listExercises } from "@/lib/repositories/exercises";
import { ExerciseList } from "./exercise-list";

export async function ExerciseLibrary() {
  const userId = await getCurrentUserId();
  const exercises = await listExercises(userId);

  return (
    <Panel label={`Library, ${exercises.length} exercises`}>
      <ExerciseList exercises={exercises} />
    </Panel>
  );
}
