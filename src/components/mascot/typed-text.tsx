"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { Mood } from "@/lib/mascot/types";
import { playSound } from "@/lib/sound";

const QUERY = "(prefers-reduced-motion: reduce)";

/** Whether the user asked their system for less motion. The server assumes they did not. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const media = window.matchMedia(QUERY);
      media.addEventListener("change", notify);
      return () => media.removeEventListener("change", notify);
    },
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}

/** Characters per second. Brisk enough not to make anyone wait. */
const SPEED = 38;

/**
 * Text that types itself out, once. Mount it with a new `key` for new text. Reduced motion shows it at once, and
 * the full text is always in the page for screen readers (the typed part is only a visual). With `blip` (a mood) it
 * also makes her small talking sound, which Settings can turn off.
 */
export function TypedText({ text, className, blip }: { text: string; className?: string; blip?: Mood }) {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const timer = setInterval(() => setCount((n) => Math.min(text.length, n + 1)), 1000 / SPEED);
    return () => clearInterval(timer);
  }, [text, reduced]);

  // A soft blip every third letter while it types, in her mood's pitch, like a character talking.
  useEffect(() => {
    if (!blip || reduced || count === 0 || count > text.length) return;
    if (count % 3 === 1 && text[count - 1] !== " ") playSound("seraBlip", { mood: blip });
  }, [blip, count, reduced, text]);

  const shown = reduced ? text.length : count;
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>{text.slice(0, shown)}</span>
    </span>
  );
}
