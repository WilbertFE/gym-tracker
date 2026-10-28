"use client";

import { useEffect, useState } from "react";
import { REST_TARGET_SECONDS, formatElapsed } from "@/lib/workout";
import { cn } from "@/lib/utils";

/**
 * Counts up from the moment the last set was logged, and starts again from zero after every new set,
 * because `since` changes then. The time turns to the accent color once the usual rest is over.
 */
export function RestTimer({ since }: { since: string | null }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (since === null) {
    return (
      <div className="flex flex-col gap-1 border bg-surface p-3">
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Rest timer</span>
        <p className="text-sm text-muted-foreground">Starts when you log your first set.</p>
      </div>
    );
  }

  const seconds = now === null ? null : Math.max(0, (now - new Date(since).getTime()) / 1000);
  const ready = seconds !== null && seconds >= REST_TARGET_SECONDS;

  return (
    <div className="flex items-end justify-between gap-4 border bg-surface p-3" role="timer" aria-label="Rest since the last set">
      <div className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Rest since last set</span>
        <time
          dateTime={since}
          className={cn("tabular text-4xl font-medium leading-none", ready && "text-primary")}
        >
          {seconds === null ? "--:--" : formatElapsed(seconds)}
        </time>
      </div>
      <span className="text-xs text-muted-foreground">{ready ? "Ready for the next set" : "Resting"}</span>
    </div>
  );
}
