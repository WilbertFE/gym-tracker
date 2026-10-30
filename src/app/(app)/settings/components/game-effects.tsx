"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { parsePrefs, prefsServerSnapshot, prefsSnapshot, setMode, subscribePrefs } from "@/components/mascot/prefs";
import { SegmentedControl } from "@/components/segmented-control";
import { EFFECTS_HELP, EFFECTS_LABELS, EFFECTS_MODES, EFFECTS_PRESETS, effectsMode, type EffectsMode } from "@/lib/effects";
import { QUICK_CHESTS_COOKIE, writeCookie } from "@/lib/feature-prefs";
import type { SeraMode } from "@/lib/mascot/state";
import { playSound, setSoundEnabled, soundEnabled } from "@/lib/sound";
import { levelUpScreenEnabled, setLevelUpScreenEnabled, setXpPopupsEnabled, xpPopupsEnabled } from "@/lib/xp-popup-pref";

const labelClass = "text-[11px] uppercase tracking-widest text-muted-foreground";

/** Fired when a device preference changes, so every control that shows it notices. */
const PREF_EVENT = "gymtrack:xp-pref";
const subscribePref = (notify: () => void) => {
  window.addEventListener(PREF_EVENT, notify);
  return () => window.removeEventListener(PREF_EVENT, notify);
};

/**
 * How loud and animated the game is: one choice (Full, Quiet or Off) that sets Sera, XP pop-ups, the full screen for big
 * moments, chest opening and sound together, and the five single switches under Advanced for anyone who wants them. All of it
 * is kept on this device and applies straight away.
 */
export function GameEffects({ quickChests }: { quickChests: boolean }) {
  const router = useRouter();
  const [quick, setQuick] = useState(quickChests);
  // Kept on this device, not in the account, and read after load so the server and browser agree.
  const popups = useSyncExternalStore(subscribePref, xpPopupsEnabled, () => true);
  const seraMode = parsePrefs(useSyncExternalStore(subscribePrefs, prefsSnapshot, prefsServerSnapshot)).mode;
  const levelScreen = useSyncExternalStore(subscribePref, levelUpScreenEnabled, () => true);
  const sound = useSyncExternalStore(subscribePref, soundEnabled, () => true);

  const mode = effectsMode({ sera: seraMode, popups, levelScreen, quickChests: quick, sound });

  const changed = () => window.dispatchEvent(new Event(PREF_EVENT));
  const setQuickChests = (on: boolean) => {
    setQuick(on);
    writeCookie(QUICK_CHESTS_COOKIE, on ? "1" : null);
    router.refresh();
  };

  function choose(next: EffectsMode) {
    const preset = EFFECTS_PRESETS[next];
    setMode(preset.sera);
    setXpPopupsEnabled(preset.popups);
    setLevelUpScreenEnabled(preset.levelScreen);
    setSoundEnabled(preset.sound);
    changed();
    setQuickChests(preset.quickChests);
    // Let the person hear it right away, from a tap, which is what browsers need.
    if (preset.sound) playSound("xpTick");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className={labelClass}>Game effects</span>
        <SegmentedControl<EffectsMode>
          label="Game effects"
          className="w-full sm:w-96"
          // A custom mix selects none of the three.
          value={mode as EffectsMode}
          onChange={choose}
          options={EFFECTS_MODES.map((m) => ({ value: m, label: EFFECTS_LABELS[m] }))}
        />
        <p className="text-xs text-muted-foreground">
          {mode === "custom" ? "Custom: you set the switches below one by one. Pick a mode to set them all at once." : EFFECTS_HELP[mode]} Kept on this device only.
        </p>
      </div>

      <details className="group border">
        <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm text-muted-foreground hover:text-foreground">Advanced: set each one</summary>
        <div className="flex flex-col gap-5 border-t p-3">
          <div className="flex flex-col gap-2">
            <span className={labelClass}>Sera, your guide</span>
            <SegmentedControl<SeraMode>
              label="Sera"
              className="w-full sm:w-96"
              value={seraMode}
              onChange={setMode}
              options={[
                { value: "normal", label: "Normal" },
                { value: "quiet", label: "Quiet" },
                { value: "off", label: "Off" },
              ]}
            />
            <p className="text-xs text-muted-foreground">Normal: she speaks up at key moments and waits to be tapped otherwise. Quiet: only when you tap her. Off: she is gone.</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" checked={quick} onChange={(e) => setQuickChests(e.target.checked)} className="size-4 accent-[var(--primary)]" />
              Open chests quickly
            </label>
            <p className="text-xs text-muted-foreground">Skips the shaking and the light and shows what you won with a short fade. A system setting for less motion does the same.</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={popups}
                onChange={(e) => {
                  setXpPopupsEnabled(e.target.checked);
                  changed();
                }}
                className="size-4 accent-[var(--primary)]"
              />
              Show a small pop-up when I earn XP
            </label>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={levelScreen}
                onChange={(e) => {
                  setLevelUpScreenEnabled(e.target.checked);
                  changed();
                }}
                className="size-4 accent-[var(--primary)]"
              />
              Full screen for big level ups, new ranks and unlocks
            </label>
            <p className="text-xs text-muted-foreground">Your XP and level are not affected.</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={sound}
                onChange={(e) => {
                  setSoundEnabled(e.target.checked);
                  changed();
                  if (e.target.checked) playSound("xpTick");
                }}
                className="size-4 accent-[var(--primary)]"
              />
              Play sounds for chests, XP, level ups and Sera
            </label>
            <p className="text-xs text-muted-foreground">
              Short synthesized sounds, no files. Sera&apos;s soft talking blips are part of it, and none of it plays until you have tapped the page once.
            </p>
          </div>
        </div>
      </details>
    </div>
  );
}
