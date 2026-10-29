"use client";

import { XIcon } from "@phosphor-icons/react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { SHOW_ALL_COOKIE, writeCookie } from "@/lib/feature-prefs";
import { renderStage } from "@/lib/mascot/beats";
import { registerPoke } from "@/lib/mascot/quirks";
import { renderNode } from "@/lib/mascot/script";
import { endOfDay, markSeen, markTold, parseMemory, rollDay, withLevel, type Memory } from "@/lib/mascot/state";
import { tourById, tourForPath, tourHref, type Tour, type TourStep } from "@/lib/mascot/tours";
import { isWorkoutScreen, pickLockedPageMoment, pickMoment } from "@/lib/mascot/triggers";
import type { Mood, Moment, NodeArgs, Reply, SeraContext, StageScript } from "@/lib/mascot/types";
import type { FeatureId } from "@/lib/unlocks";
import { cn } from "@/lib/utils";
import { ChatPanel, type Message } from "./chat-panel";
import {
  CUE_EVENT,
  parsePrefs,
  PLAY_EVENT,
  prefsServerSnapshot,
  prefsSnapshot,
  readMemoryText,
  setMode,
  setQuietUntil,
  subscribePrefs,
  writeMemoryText,
} from "./prefs";
import { SeraArt } from "./sera-art";
import { Stage } from "./stage";
import { useQuirk } from "./use-quirk";
import { availableSteps, TourOverlay } from "./tour";
import { TypedText, useReducedMotion } from "./typed-text";

type Bubble = { key: string; text: string; mood: Mood; node: string; args?: NodeArgs; offerTour?: string };

/** Wait before she first speaks on a page, so she never talks over a page that is still loading. */
const SPEAK_DELAY_MS = 1600;
/** How long a speech bubble stays when nobody touches it. */
const BUBBLE_MS = 14_000;
/** A stage waits for another dialog (a level up, a chest) to close, checking this often, for this long at most. */
const DIALOG_POLL_MS = 700;
const DIALOG_WAIT_MS = 20_000;
/** A tour waits for the page to finish loading its areas. */
const TOUR_POLL_MS = 250;
const TOUR_WAIT_MS = 5_000;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const otherDialogOpen = () => document.querySelector('[aria-modal="true"]:not([data-sera-stage])') !== null;

type StageState = { script: StageScript; key: string };
type TourState = { tour: Tour; steps: TourStep[] };

/**
 * Sera: a round avatar in the corner of every page, a speech bubble when she has something small to say, a chat you
 * open by tapping her, a big appearance over the screen for the moments that matter, and guided tours that highlight
 * the areas of a page. All of it runs in the browser from the plain facts the server gave her. She remembers what
 * she has shown on this device only, speaks up on her own only at key moments, and stays out of the way while you
 * log a workout.
 */
export function Mascot({ context, today }: { context: SeraContext; today: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const prefsText = useSyncExternalStore(subscribePrefs, prefsSnapshot, prefsServerSnapshot);
  const prefs = useMemo(() => parsePrefs(prefsText), [prefsText]);

  const [open, setOpen] = useState(false);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [stage, setStage] = useState<StageState | null>(null);
  const [tour, setTour] = useState<TourState | null>(null);
  const [thread, setThread] = useState<Message[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [mood, setMood] = useState<Mood>("calm");
  const [speaking, setSpeaking] = useState(false);

  const openRef = useRef(false);
  const busyRef = useRef(false);
  const runRef = useRef(0);
  const idRef = useRef(0);
  const memoryRef = useRef<Memory | null>(null);
  const pendingTourRef = useRef<string | null>(null);
  const avatarRef = useRef<HTMLButtonElement>(null);
  const pokesRef = useRef<number[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const memory = useCallback((): Memory => {
    if (!memoryRef.current) memoryRef.current = parseMemory(readMemoryText(), today);
    return memoryRef.current;
  }, [today]);

  const commit = useCallback((next: Memory) => {
    memoryRef.current = next;
    writeMemoryText(JSON.stringify(next));
  }, []);

  const showBubble = useCallback(
    (moment: Moment) => {
      const node = renderNode(moment.node, context, { path: pathname, ...moment.args });
      setBubble({
        key: moment.key,
        text: node.lines.slice(0, 2).join(" "),
        mood: node.mood,
        node: moment.node,
        args: moment.args,
        offerTour: moment.kind === "tourOffer" ? moment.args?.tourId : undefined,
      });
    },
    [context, pathname],
  );

  /** Sera, big. It waits for any other dialog (a level up, a chest) to close first, so two never stack. */
  const showStage = useCallback(
    async (key: string, id: string, args?: NodeArgs, ctxOverride?: SeraContext) => {
      busyRef.current = true;
      const started = Date.now();
      while (otherDialogOpen() && Date.now() - started < DIALOG_WAIT_MS) await sleep(DIALOG_POLL_MS);
      busyRef.current = false;
      setBubble(null);
      setStage({ key, script: renderStage(id, ctxOverride ?? context, args) });
    },
    [context],
  );

  /** Starts a tour once the page has its areas in place. Nothing to point at means a small apology in the chat instead. */
  const beginTour = useCallback(async (target: Tour) => {
    busyRef.current = true;
    const started = Date.now();
    let steps = availableSteps(target);
    let seen = -1;
    while ((steps.length === 0 || steps.length !== seen) && Date.now() - started < TOUR_WAIT_MS) {
      seen = steps.length;
      await sleep(TOUR_POLL_MS);
      steps = availableSteps(target);
    }
    busyRef.current = false;
    runRef.current += 1;
    setOpen(false);
    setSpeaking(false);
    setBubble(null);
    setStage(null);
    if (steps.length === 0) {
      setOpen(true);
      setThread((t) => [...t, { id: ++idRef.current, from: "sera", text: "I do not see anything to point at here yet." }]);
      setReplies([{ label: "Okay", action: "close" }]);
      return;
    }
    setTour({ tour: target, steps });
  }, []);

  /** Starts a tour: here if the page matches, otherwise it goes to the page first. */
  const startTour = useCallback(
    (id: string) => {
      const target = id === "here" ? tourForPath(pathname) : tourById(id);
      if (!target) return;
      if (tourForPath(pathname)?.id === target.id) void beginTour(target);
      else {
        pendingTourRef.current = target.id;
        router.push(tourHref(target));
      }
    },
    [pathname, router, beginTour],
  );

  // A tour that waited for its page starts when the page is there. The profile leads through a redirect, so it matches by prefix.
  useEffect(() => {
    const id = pendingTourRef.current;
    if (!id || tourForPath(pathname)?.id !== id) return;
    pendingTourRef.current = null;
    const target = tourById(id);
    if (target) void beginTour(target);
  }, [pathname, beginTour]);

  const finishTour = useCallback(() => {
    if (tour) commit(markSeen(rollDay(memory(), today), `tour:${tour.tour.id}`, today));
    setTour(null);
    avatarRef.current?.focus();
  }, [tour, commit, memory, today]);

  // She speaks up on her own, rarely, a moment after a page has loaded.
  useEffect(() => {
    if (open || stage || tour) return;
    const timer = setTimeout(() => {
      if (busyRef.current || pendingTourRef.current) return;
      const current = rollDay(memory(), today);
      const moment = pickMoment({ ctx: context, path: pathname, memory: current, prefs, now: new Date(), today, chatOpen: openRef.current });
      let next = current;
      if (moment) {
        next = markTold(next, moment.key, today, moment.kind);
        if (moment.kind === "stage") void showStage(moment.key, moment.node, moment.args);
        else showBubble(moment);
      }
      commit(withLevel(next, context.level));
    }, SPEAK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [pathname, context, prefs, today, open, stage, tour, memory, commit, showBubble, showStage]);

  // A page can ask her to speak about itself, like a locked page. She decides whether to.
  useEffect(() => {
    const onCue = (event: Event) => {
      const featureId = (event as CustomEvent<{ featureId?: FeatureId }>).detail?.featureId;
      if (!featureId || stage || tour) return;
      const current = rollDay(memory(), today);
      const moment = pickLockedPageMoment({ ctx: context, path: pathname, memory: current, prefs, now: new Date(), today, chatOpen: openRef.current }, featureId);
      if (!moment) return;
      commit(markTold(current, moment.key, today, moment.kind));
      showBubble(moment);
    };
    window.addEventListener(CUE_EVENT, onCue);
    return () => window.removeEventListener(CUE_EVENT, onCue);
  }, [context, pathname, prefs, today, stage, tour, memory, commit, showBubble]);

  // The demo sheet can play any stage or tour on purpose.
  useEffect(() => {
    const onPlay = (event: Event) => {
      const detail = (event as CustomEvent<{ stage?: string; tour?: string }>).detail;
      if (detail?.stage) {
        const demoGate = { weekStart: "2026-11-09", name: "Gate of Iron", boss: "Stone Warden", rank: "A", xp: 90, booster: true, cleared: true };
        void showStage("demo", detail.stage, { features: ["body", "quests"], days: 14 }, { ...context, gate: context.gate ?? demoGate });
      } else if (detail?.tour) {
        startTour(detail.tour);
      }
    };
    window.addEventListener(PLAY_EVENT, onPlay);
    return () => window.removeEventListener(PLAY_EVENT, onPlay);
  }, [context, showStage, startTour]);

  // A bubble nobody touches goes away by itself.
  useEffect(() => {
    if (!bubble) return;
    const timer = setTimeout(() => setBubble(null), BUBBLE_MS);
    return () => clearTimeout(timer);
  }, [bubble]);

  /** Her lines, one after another, then the buttons. Starting something new stops what was being said. */
  const say = useCallback(
    async (nodeId: string, args?: NodeArgs) => {
      const run = ++runRef.current;
      const node = renderNode(nodeId, context, { path: pathname, ...args });
      setReplies([]);
      setMood(node.mood);
      setSpeaking(true);
      for (const line of node.lines) {
        if (runRef.current !== run) return;
        setThread((t) => [...t, { id: ++idRef.current, from: "sera", text: line }]);
        await sleep(reduced ? 0 : 380 + Math.min(line.length * 7, 480));
      }
      if (runRef.current !== run) return;
      setSpeaking(false);
      setReplies(node.replies);
    },
    [context, pathname, reduced],
  );

  const openChat = useCallback(
    (nodeId?: string, args?: NodeArgs) => {
      setOpen(true);
      setBubble(null);
      // Tapping her bubble goes to what she was saying. Tapping her avatar starts at the menu, or carries on.
      if (nodeId) void say(nodeId, args);
      else if (thread.length === 0) void say("menu");
    },
    [say, thread.length],
  );

  const closeChat = useCallback(() => {
    runRef.current += 1;
    setSpeaking(false);
    setOpen(false);
    avatarRef.current?.focus();
  }, []);

  /** What a tapped reply does, in the chat or on a stage. A tour may come with a page to go to first. */
  const follow = useCallback(
    (reply: Reply) => {
      if (reply.tour) {
        const target = reply.tour === "here" ? undefined : tourById(reply.tour);
        if (reply.href && target && tourForPath(reply.href)?.id !== target.id) {
          pendingTourRef.current = target.id;
          router.push(reply.href);
        } else if (reply.href && target) {
          pendingTourRef.current = target.id;
          if (tourForPath(pathname)?.id === target.id) startTour(target.id);
          else router.push(reply.href);
        } else startTour(reply.tour);
      } else if (reply.href) router.push(reply.href);
    },
    [router, pathname, startTour],
  );

  function choose(reply: Reply) {
    setThread((t) => [...t, { id: ++idRef.current, from: "you", text: reply.label }]);
    setReplies([]);
    if (reply.tour || reply.href) {
      follow(reply);
      closeChat();
    } else if (reply.next) {
      void say(reply.next);
    } else if (reply.action === "close") {
      closeChat();
    } else if (reply.action === "quietToday") {
      setQuietUntil(endOfDay(new Date()));
      void say("quietDone");
    } else if (reply.action === "off") {
      setMode("off");
      void say("offDone");
    } else if (reply.action === "showAll") {
      writeCookie(SHOW_ALL_COOKIE, "1");
      router.refresh();
      void say("allOpen");
    }
  }

  function chooseOnStage(reply: Reply) {
    setStage(null);
    if (reply.tour || reply.href) follow(reply);
    else if (reply.next) openChat(reply.next);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeChat();
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeChat]);

  const quirk = useQuirk(!open && !speaking && !bubble && !stage && !tour);

  // She is out of the way while a workout is being logged, and gone when she is turned off (once her goodbye is read).
  if (isWorkoutScreen(pathname) || (prefs.mode === "off" && !open && !tour)) return null;

  const faceMood = open ? mood : (bubble?.mood ?? "calm");

  // Tapping her over and over annoys her.
  const tapAvatar = () => {
    const poke = registerPoke(pokesRef.current, Date.now());
    pokesRef.current = poke.taps;
    if (poke.annoyed) openChat("poked");
    else if (open) closeChat();
    else openChat();
  };

  return (
    <>
      {stage && <Stage key={stage.key} script={stage.script} onReply={chooseOnStage} onClose={() => setStage(null)} />}
      {tour && <TourOverlay tour={tour.tour} steps={tour.steps} onFinish={finishTour} />}

      <div className="pointer-events-none fixed right-4 z-[45] flex flex-col items-end gap-3 bottom-[calc(env(safe-area-inset-bottom,0px)+4.75rem)] md:bottom-6 md:right-6" data-sera>
        {open && <ChatPanel thread={thread} replies={replies} mood={mood} speaking={speaking} onChoose={choose} onClose={closeChat} panelRef={panelRef} />}

        {!open && bubble && (
          <div className="pointer-events-auto relative w-[min(19rem,calc(100vw-2rem))] motion-safe:animate-[xp-in_0.25s_ease-out]">
            <div className="system-window flex flex-col gap-1 p-1 pl-3" data-glow>
              <div className="flex items-start gap-1">
                {bubble.offerTour ? (
                  <p className="min-h-11 flex-1 py-2 text-left text-sm leading-snug">
                    <span className="sr-only">Sera says: </span>
                    <TypedText key={bubble.key} text={bubble.text} />
                  </p>
                ) : (
                  <button type="button" onClick={() => openChat(bubble.node, bubble.args)} className="min-h-11 flex-1 py-2 text-left text-sm leading-snug">
                    <span className="sr-only">Sera says: </span>
                    <TypedText key={bubble.key} text={bubble.text} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setBubble(null)}
                  aria-label="Dismiss"
                  className="flex size-11 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="size-4" aria-hidden />
                </button>
              </div>
              {bubble.offerTour && (
                <div className="flex gap-2 pb-2 pr-3">
                  <button
                    type="button"
                    onClick={() => {
                      const id = bubble.offerTour!;
                      setBubble(null);
                      startTour(id);
                    }}
                    className="font-display h-11 flex-1 bg-primary px-3 text-sm font-semibold text-primary-foreground"
                  >
                    Yes, show me
                  </button>
                  <button type="button" onClick={() => setBubble(null)} className="font-display h-11 flex-1 border border-primary/50 px-3 text-sm font-semibold">
                    No thanks
                  </button>
                </div>
              )}
            </div>
            {/* The tail of the speech bubble, pointing at her. */}
            <span aria-hidden className="absolute -bottom-1.5 right-6 size-3 rotate-45 border-b border-r border-primary/60 bg-card" />
          </div>
        )}

        <button
          ref={avatarRef}
          type="button"
          onClick={tapAvatar}
          aria-label="Chat with Sera"
          data-tour="sera"
          aria-expanded={open}
          className={cn(
            "pointer-events-auto relative size-14 shrink-0 rounded-full border-2 border-primary/70 bg-card shadow-[0_0_20px_-4px_var(--primary)] outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring motion-safe:hover:scale-105",
          )}
        >
          <span className="block size-full overflow-hidden rounded-full">
            <SeraArt mood={faceMood} view="avatar" quirk={quirk} size={60} talking={speaking} className="mx-auto mt-0.5" />
          </span>
          {bubble && !open && <span aria-hidden className="absolute -right-0.5 -top-0.5 size-3.5 rounded-full bg-primary ring-2 ring-background" />}
        </button>
      </div>
    </>
  );
}
