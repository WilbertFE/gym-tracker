import { QUIRKS, type Quirk } from "./types";

/** How long she waits between little things, in milliseconds: somewhere between these two, chosen at random. */
export const QUIRK_GAP_MS = { min: 15_000, max: 35_000 } as const;

/** How long a quirk lasts on screen. */
export const QUIRK_SHOW_MS = 1_800;

/** Tapping her this many times within {@link POKE_WINDOW_MS} is poking her. */
export const POKES_TO_ANNOY = 5;
export const POKE_WINDOW_MS = 2_500;

/** A quirk to do next: never the one she just did, so it does not look like a loop. `random` is injected so this can be tested. */
export function pickQuirk(random: () => number, last: Quirk | null = null): Quirk {
  const choices = QUIRKS.filter((q) => q !== last);
  return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
}

/** How long to wait before the next quirk. */
export const quirkGap = (random: () => number): number => Math.round(QUIRK_GAP_MS.min + random() * (QUIRK_GAP_MS.max - QUIRK_GAP_MS.min));

/**
 * Whether she may do a quirk right now: only while idle, never while she is talking, never with reduced motion, and never
 * while a tour is pointing at the page.
 */
export const mayQuirk = (state: { talking: boolean; reducedMotion: boolean; busy: boolean }): boolean => !state.talking && !state.reducedMotion && !state.busy;

/** Whether this tap is the fifth fast one, given the times of the recent taps (milliseconds). Returns the taps worth remembering. */
export function registerPoke(taps: readonly number[], now: number): { taps: number[]; annoyed: boolean } {
  const recent = [...taps.filter((t) => now - t <= POKE_WINDOW_MS), now];
  return recent.length >= POKES_TO_ANNOY ? { taps: [], annoyed: true } : { taps: recent, annoyed: false };
}
