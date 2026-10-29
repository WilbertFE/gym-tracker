"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api-client";
import { XP_CHECK_EVENT } from "@/lib/xp-diff";

type UseBoosterButtonProps = {
  /** The day to double, `YYYY-MM-DD`. */
  day: string;
  label: string;
  /** Why it cannot be used, shown under the button. Null when it can. */
  blockedReason: string | null;
};

/** Spends one Double XP Day booster on a day. */
export function UseBoosterButton({ day, label, blockedReason }: UseBoosterButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function use() {
    if (busy) return;
    setBusy(true);
    const result = await apiRequest("/api/boosts", "POST", { day });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Booster used");
    // Today's XP just doubled, so let the pop-up show what that was worth.
    window.dispatchEvent(new Event(XP_CHECK_EVENT));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <ConfirmDialog
        title="Use a Double XP booster?"
        description="It is spent on this day and cannot be taken back. Every XP you earn that day counts twice."
        confirmLabel="Use booster"
        onConfirm={use}
        trigger={
          <Button type="button" className="h-11" disabled={busy || blockedReason !== null}>
            {busy ? "Using" : label}
          </Button>
        }
      />
      {blockedReason && <p className="text-xs text-muted-foreground">{blockedReason}</p>}
    </div>
  );
}
