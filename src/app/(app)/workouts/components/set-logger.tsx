"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { NumberStepper } from "@/components/number-stepper";
import { Input } from "@/components/ui/input";
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
import { isBodyweightExercise } from "@/lib/load";
import { searchExercises } from "@/lib/exercise-search";
import { MUSCLE_GROUPS, MUSCLE_LABELS } from "@/lib/muscles";
import type { Exercise } from "@/lib/types";
import { displayWeight, toKg, type WeightUnit } from "@/lib/units";
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
  /** The unit the weight box is typed and shown in. Sets are stored in kilograms. */
  unit: WeightUnit;
  /** Today's body weight in kilograms (60 when none is logged), for the share a bodyweight exercise moves. */
  bodyWeightKg: number;
};

export function SetLogger({
  sessionId,
  exercises,
  lastSets,
  sessionExerciseIds,
  focusExerciseId,
  unit,
  bodyWeightKg,
}: SetLoggerProps) {
  const router = useRouter();
  const initial = focusExerciseId ?? sessionExerciseIds[sessionExerciseIds.length - 1] ?? "";
  const [exerciseId, setExerciseId] = useState(initial);
  const [reps, setReps] = useState(initial && lastSets[initial] ? String(lastSets[initial].reps) : "");
  const [weight, setWeight] = useState(
    initial && lastSets[initial] ? displayWeight(lastSets[initial].weight_kg, unit) : "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");

  const byId = new Map(exercises.map((e) => [e.id, e]));

  const chosen = byId.get(exerciseId);
  const bodyweight = isBodyweightExercise(chosen);
  const found = query.trim() === "" ? [] : searchExercises(exercises, query).slice(0, 8);

  function pick(id: string) {
    setExerciseId(id);
    setQuery("");
    const last = lastSets[id];
    setReps(last ? String(last.reps) : "");
    setWeight(last ? displayWeight(last.weight_kg, unit) : "");
  }

  async function log() {
    if (submitting) return;
    const parsed = setSchema.safeParse({
      exercise_id: exerciseId,
      reps: reps === "" ? NaN : Number(reps),
      weight_kg: weight === "" ? 0 : toKg(Number(weight), unit),
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
        <Input
          type="search"
          className="h-11"
          placeholder="Search, for example dumbbell press or curl"
          aria-label="Search exercises"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query.trim() !== "" && (
          <ul className="flex flex-col divide-y border" aria-label="Search results">
            {found.length === 0 ? (
              <li className="px-3 py-3 text-sm text-muted-foreground">No exercise matches. You can add your own on the exercise library page.</li>
            ) : (
              found.map((e) => (
                <li key={e.id}>
                  <button type="button" onClick={() => pick(e.id)} className="flex min-h-11 w-full flex-col px-3 py-2 text-left hover:bg-surface-raised">
                    <span className="text-sm">{e.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {[MUSCLE_LABELS[e.primary_muscle], e.equipment].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
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
          label={bodyweight ? "Added weight (optional)" : "Weight"}
          unit={unit}
          value={weight}
          onChange={setWeight}
          step={unit === "lb" ? 5 : 2.5}
          max={1000}
        />
      </div>

      {bodyweight && chosen && (
        <p className="text-xs text-muted-foreground">
          {chosen.name} moves about {chosen.bodyweight_pct}% of your body weight ({displayWeight((bodyWeightKg * (chosen.bodyweight_pct as number)) / 100, unit)} {unit} at {displayWeight(bodyWeightKg, unit)} {unit}). Leave the weight empty for no extra load, or add what you wear or hold.
        </p>
      )}

      <Button className="h-14 text-base" onClick={log} disabled={submitting}>
        {submitting ? "Logging" : "Log set"}
      </Button>
    </div>
  );
}
