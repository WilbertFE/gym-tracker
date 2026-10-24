"use client";

import { useEffect, useState } from "react";
import { formatElapsed } from "@/lib/workout";

/** Live mm:ss counter. Renders a placeholder until mounted to avoid hydration mismatch. */
export function ElapsedTimer({ since, className }: { since: string; className?: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const seconds = now === null ? null : (now - new Date(since).getTime()) / 1000;
  return (
    <time className={className} dateTime={since}>
      {seconds === null ? "--:--" : formatElapsed(seconds)}
    </time>
  );
}
