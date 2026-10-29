"use client";

import { XIcon } from "@phosphor-icons/react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { SHOW_ALL_COOKIE, writeCookie } from "@/lib/feature-prefs";
import { renderNode } from "@/lib/mascot/script";
import { endOfDay, markTold, parseMemory, rollDay, withLevel, type Memory } from "@/lib/mascot/state";
import { isWorkoutScreen, pickLockedPageMoment, pickMoment } from "@/lib/mascot/triggers";
import type { Mood, Moment, NodeArgs, Reply, SeraContext } from "@/lib/mascot/types";
import type { FeatureId } from "@/lib/unlocks";
import { cn } from "@/lib/utils";
import { ChatPanel, type Message } from "./chat-panel";
import {
  CUE_EVENT,
  parsePrefs,
  prefsServerSnapshot,
  prefsSnapshot,
  readMemoryText,
  setMode,
  setQuietUntil,
  subscribePrefs,
  writeMemoryText,
} from "./prefs";
import { SeraArt } from "./sera-art";
import { TypedText, useReducedMotion } from "./typed-text";

type Bubble = { key: string; text: string; mood: Mood; node: string; args?: NodeArgs };

/** Wait before she first speaks on a page, so she never talks over a page that is still loading. */
const SPEAK_DELAY_MS = 1600;
/** How long a speech bubble stays when nobody touches it. */
const BUBBLE_MS = 14_000;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Sera: a round avatar in the corner of every page, a speech bubble when she has something to say, and a chat you open
 * by tapping her. All of it runs in the browser from the plain facts the server gave her. She remembers what she has
 * told you on this device only, speaks up on her own only at key moments, and stays out of the way while you log a workout.
 */
export function Mascot({ context, today }: { context: SeraContext; today: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const prefsText = useSyncExternalStore(subscribePrefs, prefsSnapshot, prefsServerSnapshot);
  const prefs = useMemo(() => parsePrefs(prefsText), [prefsText]);

  const [open, setOpen] = useState(false);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [thread, setThread] = useState<Message[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [mood, setMood] = useState<Mood>("calm");
  const [speaking, setSpeaking] = useState(false);

  const openRef = useRef(false);
  const runRef = useRef(0);
  const idRef = useRef(0);
  const memoryRef = useRef<Memory | null>(null);
  const avatarRef = useRef<HTMLButtonElement>(null);
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
      setBubble({ key: moment.key, text: node.lines.slice(0, 2).join(" "), mood: node.mood, node: moment.node, args: moment.args });
    },
    [context, pathname],
  );

  // She speaks up on her own, rarely, a moment after a page has loaded.
  useEffect(() => {
    if (open) return;
    const timer = setTimeout(() => {
      const current = rollDay(memory(), today);
      const moment = pickMoment({ ctx: context, path: pathname, memory: current, prefs, now: new Date(), today, chatOpen: openRef.current });
      let next = current;
      if (moment) {
        next = markTold(next, moment.key, today);
        showBubble(moment);
      }
      commit(withLevel(next, context.level));
    }, SPEAK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [pathname, context, prefs, today, open, memory, commit, showBubble]);

  // A page can ask her to speak about itself, like a locked page. She decides whether to.
  useEffect(() => {
    const onCue = (event: Event) => {
      const featureId = (event as CustomEvent<{ featureId?: FeatureId }>).detail?.featureId;
      if (!featureId) return;
      const current = rollDay(memory(), today);
      const moment = pickLockedPageMoment({ ctx: context, path: pathname, memory: current, prefs, now: new Date(), today, chatOpen: openRef.current }, featureId);
      if (!moment) return;
      commit(markTold(current, moment.key, today));
      showBubble(moment);
    };
    window.addEventListener(CUE_EVENT, onCue);
    return () => window.removeEventListener(CUE_EVENT, onCue);
  }, [context, pathname, prefs, today, memory, commit, showBubble]);

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

  function choose(reply: Reply) {
    setThread((t) => [...t, { id: ++idRef.current, from: "you", text: reply.label }]);
    setReplies([]);
    if (reply.href) {
      router.push(reply.href);
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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeChat();
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeChat]);

  // She is out of the way while a workout is being logged, and gone when she is turned off (once her goodbye is read).
  if (isWorkoutScreen(pathname) || (prefs.mode === "off" && !open)) return null;

  const faceMood = open ? mood : (bubble?.mood ?? "calm");

  return (
    <div className="pointer-events-none fixed right-4 z-[45] flex flex-col items-end gap-3 bottom-[calc(env(safe-area-inset-bottom,0px)+4.75rem)] md:bottom-6 md:right-6" data-sera>
      {open && <ChatPanel thread={thread} replies={replies} mood={mood} speaking={speaking} onChoose={choose} onClose={closeChat} panelRef={panelRef} />}

      {!open && bubble && (
        <div className="pointer-events-auto relative w-[min(19rem,calc(100vw-2rem))] motion-safe:animate-[xp-in_0.25s_ease-out]">
          <div className="system-window flex items-start gap-1 p-1 pl-3" data-glow>
            <button type="button" onClick={() => openChat(bubble.node, bubble.args)} className="min-h-11 flex-1 py-2 text-left text-sm leading-snug">
              <span className="sr-only">Sera says: </span>
              <TypedText key={bubble.key} text={bubble.text} />
            </button>
            <button
              type="button"
              onClick={() => setBubble(null)}
              aria-label="Dismiss"
              className="flex size-11 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-4" aria-hidden />
            </button>
          </div>
          {/* The tail of the speech bubble, pointing at her. */}
          <span aria-hidden className="absolute -bottom-1.5 right-6 size-3 rotate-45 border-b border-r border-primary/60 bg-card" />
        </div>
      )}

      <button
        ref={avatarRef}
        type="button"
        onClick={() => (open ? closeChat() : openChat())}
        aria-label="Chat with Sera"
        aria-expanded={open}
        className={cn(
          "pointer-events-auto relative size-14 shrink-0 rounded-full border-2 border-primary/70 bg-card shadow-[0_0_20px_-4px_var(--primary)] outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring motion-safe:hover:scale-105",
        )}
      >
        <span className="block size-full overflow-hidden rounded-full">
          <SeraArt mood={faceMood} view="avatar" size={60} talking={speaking} className="mx-auto mt-0.5" />
        </span>
        {bubble && !open && <span aria-hidden className="absolute -right-0.5 -top-0.5 size-3.5 rounded-full bg-primary ring-2 ring-background" />}
      </button>
    </div>
  );
}
