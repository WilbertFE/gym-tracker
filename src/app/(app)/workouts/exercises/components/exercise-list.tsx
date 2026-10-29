"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { searchExercises } from "@/lib/exercise-search";
import { MUSCLE_GROUPS, MUSCLE_LABELS } from "@/lib/muscles";
import type { Exercise } from "@/lib/types";
import { DeleteExerciseButton } from "./delete-exercise-button";

/** The exercises grouped by muscle, with a search box that narrows the list as you type. */
export function ExerciseList({ exercises }: { exercises: Exercise[] }) {
  const [query, setQuery] = useState("");
  const shown = query.trim() === "" ? exercises : searchExercises(exercises, query);

  return (
    <div className="flex flex-col gap-6">
      <Input
        type="search"
        className="h-11"
        placeholder="Search, for example dumbbell press or curl"
        aria-label="Search exercises"
        autoComplete="off"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {shown.length === 0 && <p className="text-sm text-muted-foreground">No exercise matches. Add your own below.</p>}
      {MUSCLE_GROUPS.map((muscle) => {
        const items = shown.filter((e) => e.primary_muscle === muscle);
        if (items.length === 0) return null;
        return (
          <section key={muscle}>
            <h3 className="tabular mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">{MUSCLE_LABELS[muscle]}</h3>
            <ul className="flex flex-col divide-y border">
              {items.map((e) => (
                <li key={e.id} className="flex min-h-11 items-center justify-between gap-3 px-3">
                  <span className="flex flex-col py-2">
                    <span className="text-sm">{e.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {[
                        e.equipment,
                        e.bodyweight_pct ? `moves ${e.bodyweight_pct}% of your body weight` : null,
                        e.secondary_muscles.length > 0 ? `also ${e.secondary_muscles.map((m) => MUSCLE_LABELS[m]).join(", ")}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  {e.user_id ? (
                    <DeleteExerciseButton id={e.id} name={e.name} />
                  ) : (
                    <span className="tabular text-[10px] uppercase tracking-widest text-muted-foreground">Built in</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
