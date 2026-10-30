"use client";

import { TreasureChestIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { ChestOpener } from "./chest-opener";
import { Button } from "@/components/ui/button";
import { CHEST_NAMES, chestColor, type AvailableChest, type ChestKind } from "@/lib/chests";
import type { Equipment } from "@/lib/items";
import type { Rank } from "@/lib/ranks";
import { cn } from "@/lib/utils";

type ChestStripProps = {
  kind: ChestKind;
  /** The chests of this kind that can be opened now, soonest to run out first. */
  available: AvailableChest[];
  /** How many of this set's quests are finished, and how many there are. */
  done: number;
  total: number;
  rank: Rank;
  worn: Equipment;
  quick: boolean;
};

/**
 * Under a quest list: either the chest that is ready to open, or what is still missing for it. The opening
 * itself is a full screen moment (`ChestOpener`), started by the button.
 */
export function ChestStrip({ kind, available, done, total, rank, worn, quick }: ChestStripProps) {
  const [open, setOpen] = useState(false);
  const ready = available.length > 0;
  const name = CHEST_NAMES[kind];
  const color = chestColor(kind);
  const soonest = ready ? Math.min(...available.map((c) => c.daysLeft)) : null;

  const expiry =
    soonest === null ? "" : soonest === 0 ? "Last day to open it." : `Open it within ${soonest} day${soonest === 1 ? "" : "s"}.`;

  return (
    <>
      <div
        className={cn(
          "mt-3 flex items-center gap-3 border p-3",
          ready ? "border-primary/60 bg-primary/5 shadow-[0_0_18px_-8px_var(--primary)]" : "border-dashed",
        )}
      >
        <TreasureChestIcon
          aria-hidden
          weight="duotone"
          className={cn("size-8 shrink-0", !ready && "opacity-60")}
          style={{ color }}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em]">
            {ready ? `${name} chest ready` : `${name} chest`}
          </p>
          <p className="text-xs text-muted-foreground">
            {ready
              ? `${available.length > 1 ? `${available.length} waiting. ` : ""}${expiry}`
              : kind === "season"
                ? "Beat the season boss to earn it. It holds a Legendary or Mythic item."
                : kind === "gate"
                ? "Clear this week's gate to earn it. Better odds for rare items."
                : `Finish all ${total} quests to earn it (${done} of ${total}).${kind === "weekly" ? " Better odds for rarer items." : ""}`}
          </p>
        </div>
        {ready && (
          <Button type="button" className="h-11 shrink-0 px-4" onClick={() => setOpen(true)}>
            Open
          </Button>
        )}
      </div>

      {open && (
        <ChestOpener chests={available} rank={rank} worn={worn} quick={quick} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
