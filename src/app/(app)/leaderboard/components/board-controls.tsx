"use client";

import { useRouter } from "next/navigation";
import { SegmentedControl } from "@/components/segmented-control";
import type { BoardPeriod, BoardScope } from "@/lib/leaderboard";

/** Chooses the board. The choice lives in the address (?scope=&period=), so a view can be linked. */
export function BoardControls({ scope, period }: { scope: BoardScope; period: BoardPeriod }) {
  const router = useRouter();
  const go = (next: { scope?: BoardScope; period?: BoardPeriod }) => {
    const params = new URLSearchParams({ scope: next.scope ?? scope, period: next.period ?? period });
    router.replace(`/leaderboard?${params}`, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
      <SegmentedControl
        label="Where"
        className="w-full sm:w-72"
        value={scope}
        onChange={(v) => go({ scope: v })}
        options={[
          { value: "global", label: "Global" },
          { value: "country", label: "My country" },
        ]}
      />
      <SegmentedControl
        label="When"
        className="w-full sm:w-72"
        value={period}
        onChange={(v) => go({ period: v })}
        options={[
          { value: "week", label: "This week" },
          { value: "all", label: "All time" },
        ]}
      />
    </div>
  );
}
