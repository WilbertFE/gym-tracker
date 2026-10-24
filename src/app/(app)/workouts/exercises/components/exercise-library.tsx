import { Panel } from "@/components/panel";
import { getCurrentUserId } from "@/lib/auth";
import { MUSCLE_GROUPS, MUSCLE_LABELS } from "@/lib/muscles";
import { listExercises } from "@/lib/repositories/exercises";
import { DeleteExerciseButton } from "./delete-exercise-button";

export async function ExerciseLibrary() {
  const userId = await getCurrentUserId();
  const exercises = await listExercises(userId);

  return (
    <Panel label={`Library, ${exercises.length} exercises`}>
      <div className="flex flex-col gap-6">
        {MUSCLE_GROUPS.map((muscle) => {
          const items = exercises.filter((e) => e.primary_muscle === muscle);
          if (items.length === 0) return null;
          return (
            <section key={muscle}>
              <h3 className="tabular mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                {MUSCLE_LABELS[muscle]}
              </h3>
              <ul className="flex flex-col divide-y border">
                {items.map((e) => (
                  <li key={e.id} className="flex min-h-11 items-center justify-between gap-3 px-3">
                    <span className="flex flex-col py-2">
                      <span className="text-sm">{e.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {[
                          e.equipment,
                          e.secondary_muscles.length > 0
                            ? `also ${e.secondary_muscles.map((m) => MUSCLE_LABELS[m]).join(", ")}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    {e.user_id ? (
                      <DeleteExerciseButton id={e.id} name={e.name} />
                    ) : (
                      <span className="tabular text-[10px] uppercase tracking-widest text-muted-foreground">
                        Built in
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </Panel>
  );
}
