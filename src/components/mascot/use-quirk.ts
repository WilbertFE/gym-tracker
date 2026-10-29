"use client";

import { useEffect, useRef, useState } from "react";
import { pickQuirk, QUIRK_SHOW_MS, quirkGap } from "@/lib/mascot/quirks";
import type { Quirk } from "@/lib/mascot/types";
import { useReducedMotion } from "./typed-text";

/**
 * The small things she does when nobody is talking to her: now and then, for a moment, she sticks her tongue out, puffs a
 * cheek, flips her hair or turns away with a "hmph". It returns the quirk to show right now, or null. `enabled` is false
 * while she is talking or something else has her attention; reduced motion turns quirks off altogether.
 */
export function useQuirk(enabled: boolean): Quirk | null {
  const reduced = useReducedMotion();
  const [quirk, setQuirk] = useState<Quirk | null>(null);
  const last = useRef<Quirk | null>(null);
  const active = enabled && !reduced;

  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        const next = pickQuirk(Math.random, last.current);
        last.current = next;
        setQuirk(next);
        timer = setTimeout(() => {
          setQuirk(null);
          schedule();
        }, QUIRK_SHOW_MS);
      }, quirkGap(Math.random));
    };
    schedule();
    return () => clearTimeout(timer);
  }, [active]);

  return active ? quirk : null;
}
