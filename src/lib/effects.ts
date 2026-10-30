import type { SeraMode } from "@/lib/mascot/state";

/**
 * How loud and animated the game is. Five separate preferences exist (Sera, XP pop-ups, the full screen for big moments,
 * quick chest opening and sound), and most people want them all together: everything on, only what they ask for, or nothing.
 * A mode sets the five at once, and the five read back as a mode, or as "custom" when they were set one by one.
 */
export type Effects = {
  sera: SeraMode;
  popups: boolean;
  levelScreen: boolean;
  /** Chests open with a short fade instead of the full animation. */
  quickChests: boolean;
  sound: boolean;
};

export type EffectsMode = "full" | "quiet" | "off";

export const EFFECTS_MODES: readonly EffectsMode[] = ["full", "quiet", "off"];

export const EFFECTS_LABELS: Record<EffectsMode, string> = { full: "Full", quiet: "Quiet", off: "Off" };

/** What each mode means. Full is how the app starts. */
export const EFFECTS_PRESETS: Record<EffectsMode, Effects> = {
  full: { sera: "normal", popups: true, levelScreen: true, quickChests: false, sound: true },
  quiet: { sera: "quiet", popups: true, levelScreen: false, quickChests: true, sound: false },
  off: { sera: "off", popups: false, levelScreen: false, quickChests: true, sound: false },
};

export const EFFECTS_HELP: Record<EffectsMode, string> = {
  full: "Sera speaks up at key moments, XP pop-ups, full screen level ups, the whole chest opening and sound.",
  quiet: "Sera only when you tap her, XP pop-ups, quick chests, no full screens and no sound.",
  off: "Sera is gone, no pop-ups or full screens, quick chests and no sound.",
};

const same = (a: Effects, b: Effects) => a.sera === b.sera && a.popups === b.popups && a.levelScreen === b.levelScreen && a.quickChests === b.quickChests && a.sound === b.sound;

/** The mode the five preferences add up to, or "custom" when they match none of them. */
export function effectsMode(current: Effects): EffectsMode | "custom" {
  return EFFECTS_MODES.find((mode) => same(current, EFFECTS_PRESETS[mode])) ?? "custom";
}
