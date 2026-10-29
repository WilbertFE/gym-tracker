"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api-client";
import { playSound } from "@/lib/sound";
import type { WorkoutSession } from "@/lib/types";
import { formatDuration } from "@/lib/workout";

type SessionActionsProps = {
  sessionId: string;
  active: boolean;
  /** At least one set was logged, so there is something to share. */
  hasSets: boolean;
};

export function SessionActions({ sessionId, active, hasSets }: SessionActionsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [busy, setBusy] = useState<"finish" | "delete" | null>(null);

  async function finish() {
    if (busy) return;
    setBusy("finish");
    const result = await apiRequest<WorkoutSession>(`/api/workouts/${sessionId}/finish`, "POST");
    setBusy(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const minutes = result.data.duration_minutes;
    toast.success(minutes ? `Workout finished: ${formatDuration(minutes)}` : "Workout finished");
    playSound("workoutDone");
    // A workout with sets has something to show, so offer the share image straight away.
    if (hasSets) router.replace(`${pathname}?share=1`);
    else router.refresh();
  }

  async function remove() {
    if (busy) return;
    setBusy("delete");
    const result = await apiRequest(`/api/workouts/${sessionId}`, "DELETE");
    if (!result.ok) {
      setBusy(null);
      toast.error(result.error);
      return;
    }
    toast.success("Workout deleted");
    router.replace("/workouts");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {active && (
        <ConfirmDialog
          title="Finish this workout?"
          description={hasSets ? "It ends the workout and saves its time. You can still look at it afterwards." : "No sets are logged yet. It ends the workout anyway."}
          confirmLabel="Finish workout"
          onConfirm={finish}
          trigger={
            <Button className="h-12 flex-1 text-base" disabled={busy !== null}>
              {busy === "finish" ? "Finishing" : "Finish workout"}
            </Button>
          }
        />
      )}
      <ConfirmDialog
        title="Delete this workout?"
        description="The workout and all of its sets are removed, and the XP they earned goes with them. This cannot be undone."
        confirmLabel="Delete workout"
        destructive
        onConfirm={remove}
        trigger={
          <Button variant="outline" className="h-12" disabled={busy !== null}>
            {busy === "delete" ? "Deleting" : "Delete workout"}
          </Button>
        }
      />
    </div>
  );
}
