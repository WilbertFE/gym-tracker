import { toMinutes } from "@/lib/scheduling";
import type { AvailabilityBlock } from "@/lib/types";

/** Numbers for the weekly calendar grid on the schedule page. Minutes unless noted. */
export const WEEK_GRID = {
  /** Selections snap to this many minutes. */
  snapMinutes: 15,
  /** Length of a plain tap or click that did not drag. */
  tapMinutes: 60,
  /** The grid always shows at least this range. */
  minStart: 6 * 60,
  minEnd: 22 * 60,
  /** Height of one hour in pixels. */
  hourHeight: 44,
} as const;

const DAY_END = 24 * 60;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Rounds to the nearest snap step. */
export const snap = (minutes: number): number =>
  Math.round(minutes / WEEK_GRID.snapMinutes) * WEEK_GRID.snapMinutes;

/**
 * Minutes since midnight for a vertical position inside the grid, snapped.
 * `offsetY` is pixels from the top of the grid, `gridStart` the minute the grid begins at.
 */
export function minutesAtOffset(offsetY: number, gridStart: number): number {
  const raw = gridStart + (offsetY / WEEK_GRID.hourHeight) * 60;
  return clamp(snap(raw), 0, DAY_END);
}

/**
 * The time range between two pointer positions, in either direction.
 * A range shorter than one snap step grows to a one hour tap range, kept inside the day.
 */
export function selectionRange(a: number, b: number, dragged: boolean): { start: number; end: number } {
  let start = Math.min(a, b);
  let end = Math.max(a, b);
  if (!dragged || end - start < WEEK_GRID.snapMinutes) {
    start = Math.min(start, DAY_END - WEEK_GRID.tapMinutes);
    end = start + WEEK_GRID.tapMinutes;
  }
  return { start: clamp(start, 0, DAY_END), end: clamp(end, 0, DAY_END) };
}

/** `HH:MM` for a minute count, with the end of the day (1440) allowed as 23:59. */
export function toInputTime(minutes: number): string {
  const m = clamp(minutes, 0, DAY_END - 1);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** The visible range: the default hours, widened to hold every commitment. */
export function visibleRange(blocks: Pick<AvailabilityBlock, "start_time" | "end_time">[]): {
  start: number;
  end: number;
} {
  let start: number = WEEK_GRID.minStart;
  let end: number = WEEK_GRID.minEnd;
  for (const b of blocks) {
    start = Math.min(start, Math.floor(toMinutes(b.start_time) / 60) * 60);
    end = Math.max(end, Math.ceil(toMinutes(b.end_time) / 60) * 60);
  }
  return { start, end: Math.min(end, DAY_END) };
}

/** Vertical placement of a commitment inside the grid, in pixels. */
export function blockPlacement(
  block: Pick<AvailabilityBlock, "start_time" | "end_time">,
  gridStart: number,
): { top: number; height: number } {
  const start = toMinutes(block.start_time);
  const end = toMinutes(block.end_time);
  return {
    top: ((start - gridStart) / 60) * WEEK_GRID.hourHeight,
    height: ((end - start) / 60) * WEEK_GRID.hourHeight,
  };
}
