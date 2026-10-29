"use client";

import { XIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Tour, TourStep } from "@/lib/mascot/tours";
import { cn } from "@/lib/utils";
import { SeraArt } from "./sera-art";
import { useReducedMotion } from "./typed-text";

/** Room kept around the highlighted area, and above it when the page scrolls to it. */
const PAD = 6;
const SCROLL_TOP = 88;
/** About how tall the card is, to decide whether it fits below the highlighted area. */
const CARD_HEIGHT = 250;

type Box = { top: number; left: number; width: number; height: number };

/** The element a step points at. Two elements can share a target (the menu is one on a phone and another on a desktop): the visible one wins. */
export function findTarget(target: string): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`);
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

/** The steps of a tour whose area is on the page right now. A card that is locked or empty today is skipped. */
export const availableSteps = (tour: Tour): TourStep[] => tour.steps.filter((s) => findTarget(s.target) !== null);

const sameBox = (a: Box | null, b: Box | null) => (a === null || b === null ? a === b : a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height);

type TourProps = {
  tour: Tour;
  steps: TourStep[];
  onFinish: (outcome: "done" | "skipped") => void;
};

/**
 * A guided tour: the page dims, one area is cut out and glows, and Sera explains it in two plain sentences. On a
 * phone the card is a sheet at the bottom with her hand peeking over its edge (at the top when the area itself is
 * low on the screen, like the menu). Back, Next, a counter, and a way out. Arrow keys and Escape work. The page
 * behind cannot be tapped, but it still scrolls, and the glow follows.
 */
export function TourOverlay({ tour, steps, onFinish }: TourProps) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const next = useRef<HTMLButtonElement>(null);
  const frame = useRef(0);
  const step = steps[index];
  const lastStep = index === steps.length - 1;

  const measure = useCallback(() => {
    const el = findTarget(step.target);
    if (!el) return setBox(null);
    const r = el.getBoundingClientRect();
    const top = Math.max(0, r.top - PAD);
    const left = Math.max(0, r.left - PAD);
    const next: Box = {
      top,
      left,
      width: Math.min(window.innerWidth - left, r.width + PAD * 2),
      height: Math.min(window.innerHeight - top, r.bottom + PAD - top),
    };
    setBox((prev) => (sameBox(prev, next) ? prev : next));
  }, [step.target]);

  // Bring the area into the upper part of the screen, then follow it while the page settles.
  useLayoutEffect(() => {
    const el = findTarget(step.target);
    if (el) {
      const r = el.getBoundingClientRect();
      const fixed = getComputedStyle(el).position === "fixed" || el.closest("nav") !== null || el.hasAttribute("data-sera");
      if (!fixed && Math.abs(r.top - SCROLL_TOP) > 8) {
        window.scrollTo({ top: Math.max(0, window.scrollY + r.top - SCROLL_TOP), behavior: reduced ? "auto" : "smooth" });
      }
    }
    const started = performance.now();
    const tick = () => {
      measure();
      if (performance.now() - started < 900) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [step.target, measure, reduced]);

  useEffect(() => {
    const on = () => measure();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, [measure]);

  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const forward = useCallback(() => {
    if (index >= steps.length - 1) onFinish("done");
    else setIndex(index + 1);
  }, [index, steps.length, onFinish]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFinish("skipped");
      else if (e.key === "ArrowRight") forward();
      else if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [forward, back, onFinish]);

  useEffect(() => {
    next.current?.focus();
  }, [index]);

  // The card goes where there is more room, so it covers as little as possible of what it explains: the bottom sheet
  // by default, the top when the area itself is low on the screen (like the menu).
  const spaceBelow = box ? window.innerHeight - (box.top + box.height) : 0;
  const cardOnTop = box !== null && spaceBelow < CARD_HEIGHT && box.top > spaceBelow;

  return (
    <>
      {/* Catches taps so the page behind cannot be used during the tour. Scrolling still goes through. */}
      <div aria-hidden className="fixed inset-0 z-[55]" onClick={(e) => e.stopPropagation()} />

      {box ? (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[55] rounded-xl motion-safe:transition-[top,left,width,height] motion-safe:duration-300 motion-safe:ease-out motion-safe:animate-[tour-pulse_2.4s_ease-in-out_infinite]"
          style={{ top: box.top, left: box.left, width: box.width, height: box.height, boxShadow: "0 0 0 9999px rgba(2, 6, 16, 0.78), 0 0 0 2px var(--primary), 0 0 20px 2px var(--primary)" }}
        />
      ) : (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-[55] bg-[rgba(2,6,16,0.78)]" />
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Guided tour of ${tour.name}`}
        data-sera-stage
        className={cn(
          "fixed inset-x-3 z-[56] mx-auto max-w-md md:inset-x-auto md:mx-0 md:w-96",
          cardOnTop ? "top-[calc(env(safe-area-inset-top,0px)+0.75rem)]" : "bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] md:bottom-6",
          "md:right-6",
        )}
      >
        {/* Sera's hand peeks over the top edge of the sheet, pointing at the area. */}
        {!cardOnTop && (
          <span aria-hidden className="pointer-events-none absolute -top-[6.4rem] right-3 block h-[6.5rem] w-[6.75rem] overflow-hidden">
            <SeraArt view="half" pose={step.pose} mood="happy" size={108} className="max-w-none" />
          </span>
        )}

        <div className="system-window flex flex-col gap-3 p-4" data-glow>
          <div className="flex items-center gap-3">
            <span className="size-10 shrink-0 overflow-hidden rounded-full border border-primary/60 bg-surface">
              <SeraArt view="avatar" size={44} mood="happy" className="mx-auto" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="tabular text-[11px] uppercase tracking-[0.2em] text-primary">Sera, guide</p>
              <p className="truncate text-xs text-muted-foreground">A quick look at {tour.name}</p>
            </div>
            <button
              type="button"
              onClick={() => onFinish("skipped")}
              aria-label="Close the tour"
              className="flex size-11 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-5" aria-hidden />
            </button>
          </div>

          <div aria-live="polite" className="flex flex-col gap-1">
            <h2 className="font-display text-xl font-semibold leading-tight">{step.title}</h2>
            <p className="text-base leading-snug text-foreground/90">{step.text}</p>
          </div>

          <div className="flex items-center gap-3">
            <p className="tabular mr-auto text-sm text-muted-foreground" aria-label={`Step ${index + 1} of ${steps.length}`}>
              {index + 1} / {steps.length}
            </p>
            <button
              type="button"
              onClick={back}
              disabled={index === 0}
              className="font-display h-12 min-w-24 border border-primary/50 px-4 text-sm font-semibold tracking-wide enabled:hover:border-primary disabled:opacity-40"
            >
              Back
            </button>
            <button
              ref={next}
              type="button"
              onClick={forward}
              className="font-display h-12 min-w-24 bg-primary px-4 text-sm font-semibold tracking-wide text-primary-foreground"
            >
              {lastStep ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
