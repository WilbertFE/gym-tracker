"use client";

import { XIcon } from "@phosphor-icons/react";
import { useEffect, useRef, type RefObject } from "react";
import type { Mood, Reply } from "@/lib/mascot/types";
import { cn } from "@/lib/utils";
import { SeraArt } from "./sera-art";

export type Message = { id: number; from: "sera" | "you"; text: string };

type ChatPanelProps = {
  thread: Message[];
  replies: Reply[];
  mood: Mood;
  /** She is still "typing": the next line has not come yet. */
  speaking: boolean;
  onChoose: (reply: Reply) => void;
  onClose: () => void;
  panelRef: RefObject<HTMLDivElement | null>;
};

/**
 * The chat with Sera. Her lines come one after another on the left, your choices are buttons, and what you tap is
 * added on the right. It is not modal: the page behind stays usable, and Escape or the Close button puts it away.
 */
export function ChatPanel({ thread, replies, mood, speaking, onChoose, onClose, panelRef }: ChatPanelProps) {
  const log = useRef<HTMLDivElement>(null);

  // Keep the newest line in view.
  useEffect(() => {
    const el = log.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread.length, replies.length, speaking]);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Chat with Sera"
      tabIndex={-1}
      className="system-window pointer-events-auto flex max-h-[min(32rem,calc(100dvh-9rem))] w-[min(23rem,calc(100vw-2rem))] flex-col outline-none motion-safe:animate-[xp-in_0.25s_ease-out]"
      data-glow
    >
      <header className="flex items-center gap-3 border-b border-primary/25 p-3">
        <span className="size-11 shrink-0 overflow-hidden rounded-full border border-primary/60 bg-surface">
          <SeraArt mood={mood} view="avatar" size={44} talking={speaking} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="font-display text-sm font-semibold uppercase tracking-[0.18em]">Sera</p>
          <p className="tabular text-[11px] uppercase tracking-widest text-muted-foreground">System guide</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="flex size-11 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <XIcon className="size-5" aria-hidden />
        </button>
      </header>

      <div ref={log} role="log" aria-live="polite" aria-label="Conversation with Sera" className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto p-3">
        {thread.map((m) => (
          <p
            key={m.id}
            className={cn(
              "max-w-[88%] border px-3 py-2 text-sm leading-snug motion-safe:animate-[xp-in_0.2s_ease-out]",
              m.from === "sera" ? "self-start border-primary/30 bg-primary/5" : "self-end border-border bg-surface text-foreground",
            )}
          >
            <span className="sr-only">{m.from === "sera" ? "Sera: " : "You: "}</span>
            {m.text}
          </p>
        ))}
        {speaking && (
          <p aria-hidden className="flex w-fit gap-1 self-start border border-primary/30 bg-primary/5 px-3 py-2.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-1.5 rounded-full bg-primary motion-safe:animate-pulse" style={{ animationDelay: `${i * 0.18}s` }} />
            ))}
          </p>
        )}
      </div>

      {replies.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-primary/25 p-3">
          {replies.map((reply) => (
            <button
              key={reply.label}
              type="button"
              onClick={() => onChoose(reply)}
              className="min-h-11 border border-primary/40 bg-background/60 px-3 text-left text-sm transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-primary"
            >
              {reply.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
