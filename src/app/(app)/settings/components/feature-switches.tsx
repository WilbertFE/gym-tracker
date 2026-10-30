"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { NO_RECOVERY_COOKIE, SHOW_ALL_COOKIE, writeCookie } from "@/lib/feature-prefs";

/** What the app shows: every feature right away, and the easy comeback quest after a quiet day. Both apply straight away. */
export function FeatureSwitches({ showAll, recovery }: { showAll: boolean; recovery: boolean }) {
  const router = useRouter();
  const [everything, setEverything] = useState(showAll);
  const [comeback, setComeback] = useState(recovery);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={everything}
            onChange={(e) => {
              setEverything(e.target.checked);
              writeCookie(SHOW_ALL_COOKIE, e.target.checked ? "1" : null);
              router.refresh();
            }}
            className="size-4 accent-[var(--primary)]"
          />
          Show all features now
        </label>
        <p className="text-xs text-muted-foreground">Quests, boosters and the leaderboard normally open as you level up. Turn this on to see everything right away.</p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={comeback}
            onChange={(e) => {
              setComeback(e.target.checked);
              writeCookie(NO_RECOVERY_COOKIE, e.target.checked ? null : "1");
              router.refresh();
            }}
            className="size-4 accent-[var(--primary)]"
          />
          Offer an easy comeback quest after a quiet day
        </label>
        <p className="text-xs text-muted-foreground">After a day with no daily quest finished, the next day has one extra, easy quest. No XP is ever taken away.</p>
      </div>
    </div>
  );
}
