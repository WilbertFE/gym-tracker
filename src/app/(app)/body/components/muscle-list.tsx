"use client";

import { formatScore, INTENSITY_CONFIG, type MuscleStat, type Period } from "@/lib/muscle-intensity";
import { MUSCLE_LABELS, type MuscleGroup } from "@/lib/muscles";
import { cn } from "@/lib/utils";
import { LEVEL_DOT } from "./muscle-detail";

type MuscleListProps = {
  stats: MuscleStat[];
  period: Period;
  selected: MuscleGroup | null;
  onSelect: (muscle: MuscleGroup) => void;
};

/** Every muscle group as a button. Also the accessible alternative to the body model. */
export function MuscleList({ stats, period, selected, onSelect }: MuscleListProps) {
  return (
    <ul className="grid grid-cols-2 gap-1" aria-label="Muscle groups">
      {stats.map((stat) => {
        const current = stat[period];
        const isSelected = selected === stat.muscle;
        return (
          <li key={stat.muscle}>
            <button
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(stat.muscle)}
              className={cn(
                "flex min-h-11 w-full items-center justify-between gap-2 border px-3 text-left text-xs transition-colors",
                isSelected ? "border-primary text-foreground" : "bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-2">
                <span className={cn("size-2 shrink-0 rounded-full", LEVEL_DOT[current.level])} aria-hidden />
                {MUSCLE_LABELS[stat.muscle]}
              </span>
              <span className="tabular">
                {formatScore(current.score)}
                <span className="sr-only">
                  {" "}
                  weighted sets, {INTENSITY_CONFIG.labels[current.level]}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
