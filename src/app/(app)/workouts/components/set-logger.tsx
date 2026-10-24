"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { NumberStepper } from "@/components/number-stepper";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/api-client";
import { MUSCLE_GROUPS, MUSCLE_LABELS } from "@/lib/muscles";
import type { Exercise } from "@/lib/types";
import { cn } from "@/lib/utils";
import { setSchema } from "@/lib/validation/workout";

type SetLoggerProps = {
  sessionId: string;
  exercises: Exercise[];
  /** Most recent reps and weight per exercise, used to prefill. */
  lastSets: Record<string, { reps: number; weight_kg: number }>;
  /** Exercise ids already logged in this session, in order. */
  sessionExerciseIds: string[];
  /** Exercise to have selected when the logger opens, for example from a muscle group focus. */
  focusExerciseId?: string;
};

export function SetLogger({
  sessionId,
  exercises,
  lastSets,
  sessionExerciseIds,
  focusExerciseId,
}: SetLoggerProps) {
  const router = useRouter();
  const initial = focusExerciseId ?? sessionExerciseIds[sessionExerciseIds.length - 1] ?? "";
  const [exerciseId, setExerciseId] = useState(initial);
  const [reps, setReps] = useState(initial && lastSets[initial] ? String(lastSets[initial].reps) : "");
  const [weight, setWeight] = useState(
    initial && lastSets[initial] ? String(lastSets[initial].weight_kg) : "",
  );
  const [submitting, setSubmitting] = useState(false);

  const byId = new Map(exercises.map((e) => [e.id, e]));

  function pick(id: string) {
    setExerciseId(id);
    const last = lastSets[id];
    setReps(last ? String(last.reps) : "");
    setWeight(last ? String(last.weight_kg) : "");
  }

  async function log() {
    if (submitting) return;
    const parsed = setSchema.safeParse({
      exercise_id: exerciseId,
      reps: reps === "" ? NaN : Number(reps),
      weight_kg: weight === "" ? 0 : Number(weight),
    });
    if (!exerciseId) {
      toast.error("Choose an exercise first");
      return;
    }
    if (!parsed.success) {
      toast.error("Enter valid reps and weight");
      return;
    }

    setSubmitting(true);
    const result = await apiRequest(`/api/workouts/${sessionId}/sets`, "POST", parsed.data);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    // Inputs stay as they are so the next identical set is a single tap.
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {sessionExerciseIds.length > 0 && (
        <div className="flex flex-wrap gap-1" role="group" aria-label="Exercises in this workout">
          {sessionExerciseIds.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => pick(id)}
              aria-pressed={exerciseId === id}
              className={cn(
                "min-h-11 border px-3 text-xs transition-colors",
                exerciseId === id
                  ? "border-primary text-foreground"
                  : "bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              {byId.get(id)?.name ?? "Unknown"}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Exercise</span>
        <Select value={exerciseId} onValueChange={pick}>
          <SelectTrigger className="h-12 w-full" aria-label="Exercise">
            <SelectValue placeholder="Choose an exercise" />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {MUSCLE_GROUPS.map((muscle) => {
              const items = exercises.filter((e) => e.primary_muscle === muscle);
              if (items.length === 0) return null;
              return (
                <SelectGroup key={muscle}>
                  <SelectLabel>{MUSCLE_LABELS[muscle]}</SelectLabel>
                  {items.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberStepper id="reps" label="Reps" value={reps} onChange={setReps} step={1} max={1000} />
        <NumberStepper
          id="weight"
          label="Weight"
          unit="kg"
          value={weight}
          onChange={setWeight}
          step={2.5}
          max={1000}
        />
      </div>

      <Button className="h-14 text-base" onClick={log} disabled={submitting}>
        {submitting ? "Logging" : "Log set"}
      </Button>
    </div>
  );
}
