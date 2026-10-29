"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SegmentedControl } from "@/components/segmented-control";
import type { BoardPeriod, BoardScope } from "@/lib/leaderboard";

/**
 * Chooses the board. The choice lives in the address (?scope=&period=), so a view can be linked.
 * The two controls keep their own state, so picking one right after the other never undoes the first
 * while the page is still loading the new board.
 */
export function BoardControls({ scope: initialScope, period: initialPeriod }: { scope: BoardScope; period: BoardPeriod }) {
  const router = useRouter();
  const [scope, setScope] = useState(initialScope);
  const [period, setPeriod] = useState(initialPeriod);
  const [pending, startTransition] = useTransition();

  const go = (nextScope: BoardScope, nextPeriod: BoardPeriod) => {
    setScope(nextScope);
    setPeriod(nextPeriod);
    const params = new URLSearchParams({ scope: nextScope, period: nextPeriod });
    startTransition(() => router.replace(`/leaderboard?${params}`, { scroll: false }));
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between" aria-busy={pending} data-tour="board-controls">
      <SegmentedControl
        label="Where"
        className="w-full sm:w-72"
        value={scope}
        onChange={(v) => go(v, period)}
        options={[
          { value: "global", label: "Global" },
          { value: "country", label: "My country" },
        ]}
      />
      <SegmentedControl
        label="When"
        className="w-full sm:w-72"
        value={period}
        onChange={(v) => go(scope, v)}
        options={[
          { value: "week", label: "This week" },
          { value: "all", label: "All time" },
        ]}
      />
    </div>
  );
}
