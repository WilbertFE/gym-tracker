"use client";

import { useState, type ReactElement } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ConfirmDialogProps = {
  /** The button that asks. It is not clicked through: it opens the question. */
  trigger: ReactElement;
  title: string;
  description?: string;
  confirmLabel?: string;
  /** Red confirm button, for deleting something. */
  destructive?: boolean;
  /** Runs after the user confirms. The dialog stays open (and Cancel is off) until it settles. */
  onConfirm: () => void | Promise<void>;
};

/**
 * Asks one more time before an important action: finishing a workout, deleting something. Wrap the button that starts
 * the action as `trigger`, and put the action itself in `onConfirm`. Escape, clicking outside and Cancel all do nothing.
 */
export function ConfirmDialog({ trigger, title, description, confirmLabel = "Confirm", destructive = false, onConfirm }: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function confirm(event: React.MouseEvent) {
    // Keep the dialog open while the action runs, then close it ourselves.
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy} className="h-11 sm:h-9">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction variant={destructive ? "destructive" : "default"} onClick={confirm} disabled={busy} className="h-11 sm:h-9">
            {busy ? "Working" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
