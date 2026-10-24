"use client";

import { INTENSITY_CONFIG, type IntensityLevel } from "@/lib/muscle-intensity";
import { MUSCLE_LABELS, type MuscleGroup } from "@/lib/muscles";
import { cn } from "@/lib/utils";
import { BODY_DECOR, SHAPES_BY_VIEW, type BodyView } from "./body-shapes";

const FILL: Record<IntensityLevel, string> = {
  none: "fill-intensity-none",
  low: "fill-intensity-low",
  mid: "fill-intensity-mid",
  high: "fill-intensity-high",
};

const MIRROR = "translate(200 0) scale(-1 1)";

type BodySvgProps = {
  view: BodyView;
  levels: Record<MuscleGroup, IntensityLevel>;
  scores: Record<MuscleGroup, number>;
  selected: MuscleGroup | null;
  onSelect: (muscle: MuscleGroup) => void;
};

/** 2D body map. Colors transition when the period changes; selection gets an accent outline. */
export function BodySvg({ view, levels, scores, selected, onSelect }: BodySvgProps) {
  const shapes = SHAPES_BY_VIEW[view];
  const { head, neck, hands, feet } = BODY_DECOR;

  return (
    <svg
      viewBox="0 0 200 410"
      role="group"
      aria-label={`Body muscle map, ${view} view`}
      className="mx-auto h-[26rem] w-auto max-w-full touch-manipulation select-none"
    >
      <g className="fill-intensity-none" aria-hidden>
        <circle cx={head.cx} cy={head.cy} r={head.r} />
        <path d={neck} />
        <path d={hands} />
        <path d={hands} transform={MIRROR} />
        <path d={feet} />
        <path d={feet} transform={MIRROR} />
      </g>

      {shapes.map(({ muscle, d }) => {
        const isSelected = selected === muscle;
        const level = levels[muscle];
        const label = `${MUSCLE_LABELS[muscle]}, ${INTENSITY_CONFIG.labels[level]}, ${scores[muscle]} weighted sets`;
        const pathClass = cn(
          FILL[level],
          "stroke-background transition-[fill] duration-200",
          isSelected && "stroke-primary",
        );
        return (
          <g
            key={muscle}
            role="button"
            tabIndex={0}
            aria-label={label}
            aria-pressed={isSelected}
            className="cursor-pointer outline-none hover:opacity-80 focus-visible:opacity-80"
            onClick={() => onSelect(muscle)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(muscle);
              }
            }}
          >
            <path d={d} className={pathClass} strokeWidth={isSelected ? 2 : 1} />
            <path d={d} transform={MIRROR} className={pathClass} strokeWidth={isSelected ? 2 : 1} />
          </g>
        );
      })}
    </svg>
  );
}
