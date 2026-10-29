"use client";

import { CameraIcon, TrashIcon } from "@phosphor-icons/react";
import { format, parseISO } from "date-fns";
import { useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EntryPhotos } from "@/components/entry-photos";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest } from "@/lib/api-client";
import type { LogPhoto, WeightLog } from "@/lib/types";
import { displayWeight, type WeightUnit } from "@/lib/units";

type WeightHistoryProps = {
  /** Newest first. */
  logs: WeightLog[];
  /** Photos grouped by the weigh-in they belong to. */
  photosByWeight: Record<string, LogPhoto[]>;
  unit: WeightUnit;
};

export function WeightHistory({ logs, photosByWeight, unit }: WeightHistoryProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  async function remove(id: string) {
    if (busyId) return;
    setBusyId(id);
    const result = await apiRequest(`/api/weights/${id}`, "DELETE");
    setBusyId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Entry deleted");
    router.refresh();
  }

  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground">No entries yet. Log your first weight above.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Date</TableHead>
          <TableHead scope="col" className="text-right">Weight</TableHead>
          <TableHead scope="col">Photos</TableHead>
          <TableHead scope="col" className="w-12">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.slice(0, 10).map((log) => {
          const day = format(parseISO(log.date), "d MMM yyyy");
          const count = photosByWeight[log.id]?.length ?? 0;
          const open = openId === log.id;
          return (
            <Fragment key={log.id}>
              <TableRow>
                <TableCell className="tabular">{day}</TableCell>
                <TableCell className="tabular text-right">
                  {displayWeight(log.weight_kg, unit)} <span className="text-muted-foreground">{unit}</span>
                </TableCell>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : log.id)}
                    aria-expanded={open}
                    aria-label={`${open ? "Hide" : "Show"} photos for ${day}`}
                    className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <CameraIcon className="size-4" aria-hidden />
                    <span className="tabular">{count}</span>
                  </button>
                </TableCell>
                <TableCell>
                  <ConfirmDialog
                    title="Delete this weigh-in?"
                    description={`The entry from ${day} and its photos are removed.`}
                    confirmLabel="Delete entry"
                    destructive
                    onConfirm={() => remove(log.id)}
                    trigger={
                      <button
                        type="button"
                        disabled={busyId === log.id}
                        aria-label={`Delete entry from ${day}`}
                        className="flex size-11 items-center justify-center text-muted-foreground hover:text-destructive disabled:opacity-50"
                      >
                        <TrashIcon className="size-4" aria-hidden />
                      </button>
                    }
                  />
                </TableCell>
              </TableRow>
              {open && (
                <TableRow>
                  <TableCell colSpan={4} className="bg-surface">
                    <EntryPhotos kind="weight" entryId={log.id} photos={photosByWeight[log.id] ?? []} />
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
