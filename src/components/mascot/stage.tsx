"use client";

import { XIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Reply, StageScript } from "@/lib/mascot/types";
import { cn } from "@/lib/utils";
import { SeraArt } from "./sera-art";
import { useQuirk } from "./use-quirk";
import { TypedText } from "./typed-text";

/** The daily hello moves on by itself, a beat every few seconds, then goes. */
const AUTO_BEAT_MS = 2800;
const AUTO_END_MS = 3200;
/** How long her mouth moves for a beat, in characters per second like the typing. */
const TALK_CPS = 38;

const HALO = {
  blue: "bg-[radial-gradient(closest-side,var(--primary),transparent)]",
  gold: "bg-[radial-gradient(closest-side,#f5c451,transparent)]",
} as const;

type StageProps = {
  script: StageScript;
  onReply: (reply: Reply) => void;
  onClose: () => void;
};

/**
 * Sera, big, over a dimmed screen: for the moments that matter. Built for a phone first: she stands at the bottom
 * edge, waist up, about half the screen high; her words are in a card above her head and the buttons sit under
 * your thumb at the bottom. A beat at a time, tap Next (or anywhere on the dimmed screen) to go on. On a wide screen
 * she stands bottom right with the card to her left. The daily hello closes by itself. Escape or Skip puts her away.
 */
export function Stage({ script, onReply, onClose }: StageProps) {
  const [beat, setBeat] = useState(0);
  const [talking, setTalking] = useState(true);
  const primary = useRef<HTMLButtonElement>(null);
  const last = script.beats.length - 1;
  const atEnd = beat >= last;
  const full = script.body === "full";
  const mood = atEnd && script.endMood ? script.endMood : script.mood;
  const text = script.beats[beat];
  const quirk = useQuirk(!talking && !script.auto);

  const go = useCallback((next: number) => {
    setBeat(next);
    setTalking(true);
  }, []);

  // Her mouth moves while the line types, then rests.
  useEffect(() => {
    const timer = setTimeout(() => setTalking(false), Math.min(4000, (text.length / TALK_CPS) * 1000 + 200));
    return () => clearTimeout(timer);
  }, [text]);

  // The daily hello goes by itself.
  useEffect(() => {
    if (!script.auto) return;
    const timer = setTimeout(() => (beat < last ? go(beat + 1) : onClose()), beat < last ? AUTO_BEAT_MS : AUTO_END_MS);
    return () => clearTimeout(timer);
  }, [script.auto, beat, last, go, onClose]);

  useEffect(() => {
    primary.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const advance = () => {
    if (script.auto) onClose();
    else if (!atEnd) go(beat + 1);
  };

  const total = (last * AUTO_BEAT_MS + AUTO_END_MS) / 1000;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Sera, ${script.tag}`}
      data-sera-stage
      onClick={advance}
      className="fixed inset-0 z-[55] overflow-hidden bg-black/75 backdrop-blur-sm motion-safe:animate-[stage-fade_0.3s_ease-out]"
    >
      {/* Top bar: what this is, and a way out. */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 px-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <p className="tabular text-[11px] uppercase tracking-[0.3em] text-primary">[{script.tag}]</p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="flex min-h-11 items-center gap-1 px-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          Skip
          <XIcon className="size-4" aria-hidden />
        </button>
      </div>

      {/* Her words. A tail points down at her head. */}
      <div
        className={cn(
          "absolute inset-x-4 top-[calc(env(safe-area-inset-top,0px)+3rem)] mx-auto max-w-md",
          "md:inset-x-auto md:bottom-44 md:right-[26rem] md:top-auto md:mx-0 md:w-[24rem]",
          "[@media(max-height:520px)]:left-4 [@media(max-height:520px)]:right-[16rem] [@media(max-height:520px)]:mx-0 [@media(max-height:520px)]:max-w-none",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="system-window relative flex flex-col gap-3 p-4" data-glow>
          {script.auto && (
            <span
              aria-hidden
              style={{ animationDuration: `${total}s` }}
              className="absolute inset-x-0 top-0 h-0.5 origin-left bg-primary motion-safe:animate-[stage-progress_linear_forwards] motion-reduce:hidden"
            />
          )}
          <p className="min-h-[3.5rem] text-lg leading-snug" aria-live="polite">
            <TypedText key={beat} text={text} />
          </p>
          {atEnd && script.facts.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {script.facts.map((fact) => (
                <li
                  key={fact}
                  className={cn(
                    "tabular border px-2.5 py-1 text-xs uppercase tracking-wider",
                    script.halo === "gold" ? "border-[#f5c451]/60 text-[#f5c451]" : "border-primary/50 text-primary",
                  )}
                >
                  {fact}
                </li>
              ))}
            </ul>
          )}
          {script.beats.length > 1 && (
            <p aria-hidden className="tabular text-[11px] text-muted-foreground">
              {beat + 1} / {script.beats.length}
            </p>
          )}
          <span
            aria-hidden
            className="absolute -bottom-2 left-1/2 size-4 -translate-x-1/2 rotate-45 border-b border-r border-primary/60 bg-card md:left-auto md:right-10 md:translate-x-0 md:-rotate-45 md:-bottom-2 md:border-b-0 md:border-r md:border-t"
          />
        </div>
      </div>

      {/* Sera. Waist up from the bottom edge, or in full for the rarest moments: then she stands above the buttons, between the card and them. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-1/2 -translate-x-1/2 md:left-auto md:right-8 md:translate-x-0 [@media(max-height:520px)]:right-4 [@media(max-height:520px)]:left-auto [@media(max-height:520px)]:translate-x-0",
          full
            ? "bottom-[8.5rem] h-[clamp(240px,calc(100dvh-21rem),620px)] md:bottom-4 md:h-[min(88dvh,720px)] [@media(max-height:520px)]:bottom-0 [@media(max-height:520px)]:h-[min(64dvh,260px)]"
            : "bottom-0 h-[min(52dvh,440px)] md:h-[min(72dvh,540px)] [@media(max-height:520px)]:h-[min(64dvh,260px)]",
        )}
      >
        <div className={cn("absolute -inset-x-[70%] bottom-0 h-[105%] blur-2xl motion-safe:animate-[stage-halo_3.4s_ease-in-out_infinite]", HALO[script.halo])} />
        <div className="relative h-full motion-safe:animate-[stage-rise_0.7s_cubic-bezier(0.2,0.9,0.3,1)_both]">
          {full && (
            <SeraArt
              view="full"
              pose={script.pose}
              mood={mood}
              quirk={quirk}
              talking={talking}
              fluid
              className="h-full w-auto max-w-none [@media(max-height:520px)]:hidden"
            />
          )}
          <SeraArt
            view="half"
            pose={script.pose}
            mood={mood}
            quirk={quirk}
            talking={talking}
            fluid
            className={cn("h-full w-auto max-w-none", full && "hidden [@media(max-height:520px)]:block")}
          />
        </div>
      </div>

      {/* The buttons, under the thumb. */}
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-background via-background/85 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-14 md:inset-x-auto md:bottom-8 md:right-[26rem] md:w-[24rem] md:bg-none md:p-0 [@media(max-height:520px)]:inset-x-auto [@media(max-height:520px)]:bottom-3 [@media(max-height:520px)]:left-4 [@media(max-height:520px)]:right-[16rem] [@media(max-height:520px)]:w-auto [@media(max-height:520px)]:flex-row [@media(max-height:520px)]:bg-none [@media(max-height:520px)]:p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <StageButtons script={script} atEnd={atEnd} primary={primary} onNext={() => go(beat + 1)} onReply={onReply} />
      </div>
    </div>
  );
}

function StageButtons({
  script,
  atEnd,
  primary,
  onNext,
  onReply,
}: {
  script: StageScript;
  atEnd: boolean;
  primary: React.RefObject<HTMLButtonElement | null>;
  onNext: () => void;
  onReply: (reply: Reply) => void;
}) {
  if (!atEnd) {
    return (
      <button
        ref={primary}
        type="button"
        onClick={onNext}
        className="font-display h-12 w-full bg-primary px-5 text-sm font-semibold uppercase tracking-widest text-primary-foreground"
      >
        Next
      </button>
    );
  }
  return (
    <>
      {script.replies.map((reply, i) => (
        <button
          key={reply.label}
          ref={i === 0 ? primary : undefined}
          type="button"
          onClick={() => onReply(reply)}
          className={cn(
            "font-display h-12 w-full px-5 text-sm font-semibold tracking-wide",
            i === 0 ? "bg-primary text-primary-foreground" : "border border-primary/50 bg-background/70 text-foreground hover:border-primary",
          )}
        >
          {reply.label}
        </button>
      ))}
    </>
  );
}
