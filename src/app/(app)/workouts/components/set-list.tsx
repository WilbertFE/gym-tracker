"use client";

import { TrashIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { apiRequest } from "@/lib/api-client";
import { MUSCLE_LABELS } from "@/lib/muscles";
import { displayWeight, type WeightUnit } from "@/lib/units";
import { formatElapsed, type ExerciseGroup } from "@/lib/workout";

type SetListProps = {
  sessionId: string;
  groups: ExerciseGroup[];
  editable: boolean;
  unit: WeightUnit;
  /** Seconds of rest before each set, by set id. Missing for the first set of a workout. */
  rest: Record<string, number>;
  /** Seconds into the workout when each set was done, by set id. */
  at: Record<string, number>;
};

export function SetList({ sessionId, groups, editable, unit, rest, at }: SetListProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function remove(setId: string) {
    if (busyId) return;
    setBusyId(setId);
    const result = await apiRequest(`/api/workouts/${sessionId}/sets/${setId}`, "DELETE");
    setBusyId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">No sets logged yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-6">
      {groups.map((group) => (
        <li key={group.exercise_id}>
          <h3 className="mb-2 flex items-baseline justify-between gap-2 text-sm font-medium">
            {group.exercise?.name ?? "Unknown exercise"}
            {group.exercise && (
              <span className="tabular text-[11px] uppercase tracking-widest text-muted-foreground">
                {MUSCLE_LABELS[group.exercise.primary_muscle]}
              </span>
            )}
          </h3>
          <ol className="flex flex-col divide-y border">
            {group.sets.map((set) => (
              <li key={set.id} className="flex min-h-11 items-center justify-between gap-3 px-3">
                <span className="tabular w-8 text-xs text-muted-foreground">{set.set_number}</span>
                <span className="tabular flex-1 text-sm">
                  {set.reps} <span className="text-muted-foreground">reps</span>
                  {"  "}
                  {set.weight_kg > 0 ? (
                    <>
                      {displayWeight(set.weight_kg, unit)} <span className="text-muted-foreground">{unit}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">bodyweight</span>
                  )}
                </span>
                <span className="tabular flex flex-col items-end text-[11px] leading-tight text-muted-foreground">
                  {at[set.id] !== undefined && <span className="text-foreground">{formatElapsed(at[set.id])}</span>}
                  {rest[set.id] !== undefined && <span>rest {formatElapsed(rest[set.id])}</span>}
                </span>
                {editable && (
                  <ConfirmDialog
                    title={`Delete set ${set.set_number}?`}
                    description={`Set ${set.set_number} of ${group.exercise?.name ?? "this exercise"} is removed from the workout.`}
                    confirmLabel="Delete set"
                    destructive
                    onConfirm={() => remove(set.id)}
                    trigger={
                      <button
                        type="button"
                        disabled={busyId === set.id}
                        aria-label={`Delete set ${set.set_number} of ${group.exercise?.name ?? "exercise"}`}
                        className="flex size-11 items-center justify-center text-muted-foreground hover:text-destructive disabled:opacity-50"
                      >
                        <TrashIcon className="size-4" aria-hidden />
                      </button>
                    }
                  />
                )}
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ul>
  );
}
