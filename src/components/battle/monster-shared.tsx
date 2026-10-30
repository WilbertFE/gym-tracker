import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type MonsterState = "idle" | "hit" | "strike" | "down";

export type MonsterArtProps = {
  state?: MonsterState;
  /** 0 to 1, the share of its HP left. Marks of damage spread across it as it falls. */
  hp?: number;
  /** Width in pixels. The height follows. */
  size?: number;
  className?: string;
};

/**
 * The frame every monster is drawn in: a 240 by 260 box with its shadow on the ground, facing left toward the hero. The
 * body of the monster goes in a group with the class `battle-monster-body`, which is what CSS moves and tips over.
 */
export function MonsterFrame({ state = "idle", size = 240, className, children }: Pick<MonsterArtProps, "state" | "size" | "className"> & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 240 260"
      width={size}
      height={(size * 260) / 240}
      aria-hidden
      focusable="false"
      className={cn("battle-monster block overflow-visible", className)}
      data-state={state}
    >
      <ellipse cx={120} cy={250} rx={92} ry={7} fill="#000" opacity={0.4} />
      {children}
    </svg>
  );
}

/** How many marks of damage show: none at full health, one below 75 percent, two below 50, three below 25 and when it falls. */
export const woundCount = (hp: number, down: boolean): number => (down ? 3 : hp <= 0.25 ? 3 : hp <= 0.5 ? 2 : hp <= 0.75 ? 1 : 0);

/** Scratches and cracks drawn over a monster as it is hurt. `marks` are path strings, shown in order. */
export function Wounds({ hp, down, marks, color = "#0a101c" }: { hp: number; down: boolean; marks: readonly string[]; color?: string }) {
  const count = woundCount(hp, down);
  return (
    <g stroke={color} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round">
      {marks.slice(0, count).map((d) => (
        <path key={d} d={d} />
      ))}
    </g>
  );
}
