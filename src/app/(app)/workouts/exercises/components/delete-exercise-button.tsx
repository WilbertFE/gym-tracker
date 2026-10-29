"use client";

import { TrashIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { apiRequest } from "@/lib/api-client";

export function DeleteExerciseButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (busy) return;
    setBusy(true);
    const result = await apiRequest(`/api/exercises/${id}`, "DELETE");
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Exercise deleted");
    router.refresh();
  }

  return (
    <ConfirmDialog
      title={`Delete ${name}?`}
      description="Your custom exercise is removed from the library. Sets already logged with it stay in your workouts."
      confirmLabel="Delete exercise"
      destructive
      onConfirm={remove}
      trigger={
        <button
          type="button"
          disabled={busy}
          aria-label={`Delete ${name}`}
          className="flex size-11 items-center justify-center text-muted-foreground hover:text-destructive disabled:opacity-50"
        >
          <TrashIcon className="size-4" aria-hidden />
        </button>
      }
    />
  );
}
