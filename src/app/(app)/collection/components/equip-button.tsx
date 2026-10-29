"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api-client";
import type { Slot } from "@/lib/items";

type EquipButtonProps = {
  slot: Slot;
  itemId: string;
  name: string;
  worn: boolean;
};

/** Puts an owned item on, or takes it off if it is already worn. */
export function EquipButton({ slot, itemId, name, worn }: EquipButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const result = await apiRequest("/api/equipment", "PUT", { slot, itemId: worn ? null : itemId });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(worn ? `${name} taken off` : `${name} equipped`);
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant={worn ? "default" : "outline"}
      className="h-11 w-full"
      onClick={toggle}
      disabled={busy}
      aria-pressed={worn}
      aria-label={`${worn ? "Take off" : "Equip"} ${name}`}
    >
      {busy ? "Saving" : worn ? "Worn" : "Equip"}
    </Button>
  );
}
