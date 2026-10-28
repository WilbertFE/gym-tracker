"use client";

import { XIcon } from "@phosphor-icons/react";
import { useState, useSyncExternalStore } from "react";

const KEY = (id: string) => `ml:tip:${id}`;
const subscribe = () => () => {};

const wasSeen = (id: string): boolean => {
  try {
    return localStorage.getItem(KEY(id)) === "1";
  } catch {
    return false;
  }
};

/**
 * A one-line tip that shows once, the first time something is on screen, and stays gone once closed
 * (on this device). Meant for "this just unlocked, here is what it does", never as a tour.
 */
export function SystemTip({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  // The server cannot know what this device has seen, so it renders nothing and the browser decides.
  const seen = useSyncExternalStore(subscribe, () => wasSeen(id), () => true);
  const [closed, setClosed] = useState(false);
  if (seen || closed) return null;

  return (
    <div role="note" className="flex items-start gap-3 border border-primary/50 bg-primary/5 p-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="tabular text-[11px] uppercase tracking-widest text-primary">{title}</p>
        <p className="text-sm text-muted-foreground">{children}</p>
      </div>
      <button
        type="button"
        aria-label="Close tip"
        onClick={() => {
          try {
            localStorage.setItem(KEY(id), "1");
          } catch {
            // Without storage the tip just comes back next visit, which is fine.
          }
          setClosed(true);
        }}
        className="flex size-11 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
      >
        <XIcon className="size-4" aria-hidden />
      </button>
    </div>
  );
}
