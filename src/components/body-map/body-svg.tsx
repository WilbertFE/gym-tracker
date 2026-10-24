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
  selected?: MuscleGroup | null;
  /**
   * When set, every muscle is a button. When left out the map is display only:
   * the muscles are not focusable and the caller must give a text alternative.
   */
  onSelect?: (muscle: MuscleGroup) => void;
  /** Sizing classes. Defaults to the large map used on the Body page. */
  className?: string;
};

/** 2D body map. Colors transition when the period changes; selection gets an accent outline. */
export function BodySvg({
  view,
  levels,
  scores,
  selected = null,
  onSelect,
  className = "h-[26rem]",
}: BodySvgProps) {
  const shapes = SHAPES_BY_VIEW[view];
  const { head, neck, hands, feet } = BODY_DECOR;
  const interactive = onSelect !== undefined;

  return (
    <svg
      viewBox="0 0 200 410"
      role={interactive ? "group" : "img"}
      aria-label={
        interactive
          ? `Body muscle map, ${view} view`
          : `Body muscle map, ${view} view. The list next to it names each muscle and its level.`
      }
      className={cn("mx-auto w-auto max-w-full touch-manipulation select-none", className)}
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
        const strokeWidth = isSelected ? 2 : 1;

        if (!interactive) {
          return (
            <g key={muscle}>
              <title>{label}</title>
              <path d={d} className={pathClass} strokeWidth={strokeWidth} />
              <path d={d} transform={MIRROR} className={pathClass} strokeWidth={strokeWidth} />
            </g>
          );
        }

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
            <path d={d} className={pathClass} strokeWidth={strokeWidth} />
            <path d={d} transform={MIRROR} className={pathClass} strokeWidth={strokeWidth} />
          </g>
        );
      })}
    </svg>
  );
}
