"use client";

import { format } from "date-fns";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * A clock time in the viewer's own time zone. The server does not know that zone, so it renders a
 * placeholder and the browser fills in the real time, which also avoids a hydration mismatch.
 */
export function LocalTime({ iso, className }: { iso: string; className?: string }) {
  const text = useSyncExternalStore(
    subscribe,
    () => format(new Date(iso), "HH:mm"),
    () => "--:--",
  );
  return (
    <time dateTime={iso} className={className}>
      {text}
    </time>
  );
}
