"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api-client";
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
  const [confirmDelete, setConfirmDelete] = useState(false);

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
        <Button className="h-12 flex-1 text-base" onClick={finish} disabled={busy !== null}>
          {busy === "finish" ? "Finishing" : "Finish workout"}
        </Button>
      )}
      {confirmDelete ? (
        <div className="flex gap-2">
          <Button variant="destructive" className="h-12" onClick={remove} disabled={busy !== null}>
            {busy === "delete" ? "Deleting" : "Confirm delete"}
          </Button>
          <Button variant="outline" className="h-12" onClick={() => setConfirmDelete(false)} disabled={busy !== null}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button variant="outline" className="h-12" onClick={() => setConfirmDelete(true)}>
          Delete workout
        </Button>
      )}
    </div>
  );
}
