"use client";

import { TrashIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api-client";
import { WEEKDAY_NAMES, WEEKDAY_ORDER } from "@/lib/scheduling";
import type { AvailabilityBlock } from "@/lib/types";

/** The whole week, Monday first. `blocks` is already sorted by start time. */
export function AvailabilityList({ blocks }: { blocks: AvailabilityBlock[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function remove(id: string) {
    if (busyId) return;
    setBusyId(id);
    const result = await apiRequest(`/api/availability/${id}`, "DELETE");
    setBusyId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Commitment removed");
    router.refresh();
  }

  return (
    <ul className="flex flex-col divide-y border">
      {WEEKDAY_ORDER.map((weekday) => {
        const day = blocks.filter((b) => b.weekday === weekday);
        return (
          <li key={weekday} className="grid gap-2 p-3 sm:grid-cols-[8rem_1fr] sm:items-start">
            <h3 className="tabular text-[11px] uppercase tracking-widest text-muted-foreground sm:pt-3">
              {WEEKDAY_NAMES[weekday]}
            </h3>
            {day.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground sm:py-3">Free all day</p>
            ) : (
              <ul className="flex flex-col">
                {day.map((b) => (
                  <li key={b.id} className="flex min-h-11 items-center justify-between gap-3">
                    <span className="text-sm">
                      <span className="tabular">
                        {b.start_time} to {b.end_time}
                      </span>
                      {b.label && <span className="ml-3 text-muted-foreground">{b.label}</span>}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(b.id)}
                      disabled={busyId === b.id}
                      aria-label={`Remove ${b.label ?? "commitment"} on ${WEEKDAY_NAMES[b.weekday]} ${b.start_time} to ${b.end_time}`}
                      className="flex size-11 shrink-0 items-center justify-center text-muted-foreground hover:text-destructive disabled:opacity-50"
                    >
                      <TrashIcon className="size-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
