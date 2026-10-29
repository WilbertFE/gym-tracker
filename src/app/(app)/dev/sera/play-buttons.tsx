"use client";

import { PLAY_EVENT } from "@/components/mascot/prefs";
import { STAGE_IDS } from "@/lib/mascot/beats";
import { TOUR_IDS } from "@/lib/mascot/tours";

const play = (detail: { stage?: string; tour?: string }) => window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail }));

const button = "min-h-11 border border-primary/40 bg-background/60 px-3 text-sm hover:border-primary hover:bg-primary/10";

/** Demo only: plays any big appearance or tour right now, without having to earn it. */
export function PlayButtons() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-sm font-semibold uppercase tracking-[0.18em]">Big appearances</h2>
        <ul className="flex flex-wrap gap-2">
          {STAGE_IDS.map((id) => (
            <li key={id}>
              <button type="button" className={button} onClick={() => play({ stage: id })}>
                {id}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-sm font-semibold uppercase tracking-[0.18em]">Tours (go to the page first)</h2>
        <ul className="flex flex-wrap gap-2">
          {TOUR_IDS.map((id) => (
            <li key={id}>
              <button type="button" className={button} onClick={() => play({ tour: id })}>
                {id}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
