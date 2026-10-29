"use client";

import { useEffect, useRef } from "react";
import { RankBadge } from "@/components/rank-badge";
import { Button } from "@/components/ui/button";
import { playSound } from "@/lib/sound";
import type { Feature } from "@/lib/unlocks";
import { SYSTEM } from "@/lib/system-voice";
import { levelsGained, type XpGain } from "@/lib/xp-diff";

/** How long it stays when nothing is unlocked, and when something is (longer, there is something to read). */
const SHOW_MS = 5000;
const SHOW_LONG_MS = 8000;
/** More than this many unlocks are summarised, so the card never grows taller than a phone screen. */
const MAX_UNLOCKS = 3;

/**
 * The big moment: a level up of several levels, a new rank, or something that just unlocked. A card in
 * the middle of a dimmed screen, closed by a tap, Escape or the button, and on its own after a few
 * seconds. It plays a short fanfare (Settings can turn sound off), and with reduced motion it simply appears.
 */
export function LevelUpScreen({ gain, unlocked, onClose }: { gain: XpGain; unlocked: Feature[]; onClose: () => void }) {
  const button = useRef<HTMLButtonElement>(null);

  // The fanfare: a bigger one for a new rank.
  const rankedUp = gain.rankedUp;
  useEffect(() => {
    playSound(rankedUp ? "rankUp" : "levelUp");
  }, [rankedUp]);

  useEffect(() => {
    button.current?.focus();
    const timer = setTimeout(onClose, unlocked.length > 0 ? SHOW_LONG_MS : SHOW_MS);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, unlocked.length]);

  const jumped = levelsGained(gain);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${SYSTEM.levelUp}, level ${gain.to.level}`}
      className="fixed inset-0 z-[60] overflow-y-auto bg-black/80 backdrop-blur-sm motion-safe:animate-[xp-in_0.3s_ease-out]"
      onClick={onClose}
    >
      {/* Scrolls on a short screen, so the button is always reachable. */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="system-window flex w-full max-w-sm flex-col items-center gap-3 p-5 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="tabular text-[11px] uppercase tracking-[0.3em] text-primary">[{SYSTEM.tag}]</p>

          <span className="motion-safe:animate-[xp-pop_0.7s_ease-out]">
            <RankBadge rank={gain.rank} size={96} />
          </span>

          <div className="flex flex-col gap-1">
            <p className="tabular text-3xl font-semibold uppercase tracking-widest text-primary">{SYSTEM.levelUp}</p>
            <p className="tabular text-5xl font-semibold leading-none">{gain.to.level}</p>
            {jumped > 1 && (
              <p className="tabular text-xs text-muted-foreground">
                +{jumped} levels, from {gain.from.level}
              </p>
            )}
          </div>

          {gain.rankedUp && (
            <p className="tabular border border-primary px-3 py-1 text-xs uppercase tracking-widest text-primary">
              {SYSTEM.rankUp}: {gain.rank.name}
            </p>
          )}

          {unlocked.length > 0 && (
            <div className="flex w-full flex-col gap-2 border-t pt-4 text-left">
              <p className="tabular text-[11px] uppercase tracking-widest text-muted-foreground">{SYSTEM.unlocked}</p>
              <ul className="flex flex-col gap-2">
                {unlocked.slice(0, MAX_UNLOCKS).map((f) => (
                  <li key={f.id} className="flex flex-col">
                    <span className="text-sm font-medium">{f.name}</span>
                    <span className="text-xs text-muted-foreground">{f.blurb}</span>
                  </li>
                ))}
              </ul>
              {unlocked.length > MAX_UNLOCKS && (
                <p className="text-xs text-muted-foreground">and {unlocked.length - MAX_UNLOCKS} more</p>
              )}
            </div>
          )}

          <p className="tabular text-xs text-muted-foreground">+{gain.gained} XP</p>

          <Button ref={button} type="button" className="h-11 w-full" onClick={onClose}>
            {SYSTEM.continue}
          </Button>
        </div>
      </div>
    </div>
  );
}
