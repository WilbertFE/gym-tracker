"use client";

import { TrashIcon } from "@phosphor-icons/react";
import { format, parseISO } from "date-fns";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest } from "@/lib/api-client";
import { deltaVsPrevious, MEASUREMENT_FIELDS } from "@/lib/progress";
import type { BodyMeasurement } from "@/lib/types";

/** `rowsDesc` is newest first. Each value shows its change since the previous entry. */
export function MeasurementHistory({ rowsDesc }: { rowsDesc: BodyMeasurement[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function remove(id: string) {
    if (busyId) return;
    setBusyId(id);
    const result = await apiRequest(`/api/measurements/${id}`, "DELETE");
    setBusyId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Entry deleted");
    router.refresh();
  }

  if (rowsDesc.length === 0) {
    return <p className="text-sm text-muted-foreground">No measurements yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Date</TableHead>
          {MEASUREMENT_FIELDS.map((f) => (
            <TableHead key={f.key} scope="col" className="text-right">
              {f.label}
              <span className="ml-1 font-normal text-muted-foreground">{f.unit}</span>
            </TableHead>
          ))}
          <TableHead scope="col" className="w-12">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rowsDesc.map((row, index) => (
          <TableRow key={row.id}>
            <TableCell className="tabular whitespace-nowrap">
              {format(parseISO(row.date), "d MMM yyyy")}
            </TableCell>
            {MEASUREMENT_FIELDS.map((f) => {
              const value = row[f.key];
              const delta = deltaVsPrevious(rowsDesc, index, f.key);
              return (
                <TableCell key={f.key} className="tabular text-right">
                  {value === null ? (
                    <span className="text-muted-foreground">n/a</span>
                  ) : (
                    <>
                      {value}
                      {delta !== null && delta !== 0 && (
                        <span className="block text-[10px] text-muted-foreground">
                          {delta > 0 ? "+" : ""}
                          {delta}
                        </span>
                      )}
                    </>
                  )}
                </TableCell>
              );
            })}
            <TableCell>
              <button
                type="button"
                onClick={() => remove(row.id)}
                disabled={busyId === row.id}
                aria-label={`Delete measurements from ${format(parseISO(row.date), "d MMM yyyy")}`}
                className="flex size-11 items-center justify-center text-muted-foreground hover:text-destructive disabled:opacity-50"
              >
                <TrashIcon className="size-4" aria-hidden />
              </button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
