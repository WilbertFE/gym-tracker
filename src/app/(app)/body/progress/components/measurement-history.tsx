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

  const confirmLabel = (row: BodyMeasurement) =>
    `Delete measurements from ${format(parseISO(row.date), "d MMM yyyy")}`;

  return (
    <>
      {/* Phones: one card per day, because eight table columns do not fit. */}
      <ul className="flex flex-col gap-3 sm:hidden">
        {rowsDesc.map((row, index) => (
          <li key={row.id} className="border border-primary/25 bg-surface p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="tabular text-sm font-medium">{format(parseISO(row.date), "d MMM yyyy")}</p>
              <button
                type="button"
                onClick={() => remove(row.id)}
                disabled={busyId === row.id}
                aria-label={confirmLabel(row)}
                className="-my-2 -mr-2 flex size-11 items-center justify-center text-muted-foreground hover:text-destructive disabled:opacity-50"
              >
                <TrashIcon className="size-4" aria-hidden />
              </button>
            </div>
            <dl className="grid grid-cols-3 gap-x-3 gap-y-3">
              {MEASUREMENT_FIELDS.filter((f) => row[f.key] !== null).map((f) => {
                const delta = deltaVsPrevious(rowsDesc, index, f.key);
                return (
                  <div key={f.key} className="flex flex-col gap-0.5">
                    <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">{f.label}</dt>
                    <dd className="tabular text-base">
                      {row[f.key]}
                      <span className="ml-1 text-[10px] text-muted-foreground">{f.unit}</span>
                      {delta !== null && delta !== 0 && (
                        <span className="block text-[10px] text-muted-foreground">
                          {delta > 0 ? "+" : ""}
                          {delta}
                        </span>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto sm:block">
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
                    aria-label={confirmLabel(row)}
                    className="flex size-11 items-center justify-center text-muted-foreground hover:text-destructive disabled:opacity-50"
                  >
                    <TrashIcon className="size-4" aria-hidden />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
