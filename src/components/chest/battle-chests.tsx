"use client";

import { TreasureChestIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { ChestOpener } from "@/components/chest/chest-opener";
import { Button } from "@/components/ui/button";
import { CHEST_TIER, chestColor, type AvailableChest } from "@/lib/chests";
import { gradeRank } from "@/lib/items";
import type { Equipment } from "@/lib/items";
import type { Rank } from "@/lib/ranks";

type BattleChestsProps = {
  /** The chests the fights earned (gate, season and friends) that can be opened now. */
  available: AvailableChest[];
  rank: Rank;
  worn: Equipment;
  quick: boolean;
};

/**
 * One line for every chest the fights earned, whichever fight it came from, with a button that opens them one after another.
 * It shows nothing when there is none, so the dashboard and the Battle page carry no empty strip.
 */
export function BattleChests({ available, rank, worn, quick }: BattleChestsProps) {
  const [open, setOpen] = useState(false);
  if (available.length === 0) return null;

  // The strip takes the color of the rarest chest waiting.
  const rarest = [...available].sort((a, b) => gradeRank(CHEST_TIER[b.kind]) - gradeRank(CHEST_TIER[a.kind]))[0];
  const soonest = Math.min(...available.map((c) => c.daysLeft));

  return (
    <>
      <div className="flex items-center gap-3 border border-primary/60 bg-primary/5 p-3 shadow-[0_0_18px_-8px_var(--primary)]">
        <TreasureChestIcon aria-hidden weight="duotone" className="size-8 shrink-0" style={{ color: chestColor(rarest.kind) }} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em]">
            {available.length} battle chest{available.length === 1 ? "" : "s"} ready
          </p>
          <p className="text-xs text-muted-foreground">{soonest === 0 ? "Last day to open one." : `Open them within ${soonest} day${soonest === 1 ? "" : "s"}.`}</p>
        </div>
        <Button type="button" className="h-11 shrink-0 px-4" onClick={() => setOpen(true)}>
          Open
        </Button>
      </div>
      {open && <ChestOpener chests={available} rank={rank} worn={worn} quick={quick} onClose={() => setOpen(false)} />}
    </>
  );
}
