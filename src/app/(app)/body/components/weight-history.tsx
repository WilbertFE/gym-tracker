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
import type { WeightLog } from "@/lib/types";

/** Newest first. */
export function WeightHistory({ logs }: { logs: WeightLog[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

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
          <TableHead scope="col" className="w-12">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.slice(0, 10).map((log) => (
          <TableRow key={log.id}>
            <TableCell className="tabular">{format(parseISO(log.date), "d MMM yyyy")}</TableCell>
            <TableCell className="tabular text-right">
              {log.weight_kg.toFixed(1)} <span className="text-muted-foreground">kg</span>
            </TableCell>
            <TableCell>
              <button
                type="button"
                onClick={() => remove(log.id)}
                disabled={busyId === log.id}
                aria-label={`Delete entry from ${format(parseISO(log.date), "d MMM yyyy")}`}
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
