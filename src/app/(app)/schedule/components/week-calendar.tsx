"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api-client";
import { toMinutes, toTime, WEEKDAY_NAMES, WEEKDAY_ORDER } from "@/lib/scheduling";
import type { AvailabilityBlock } from "@/lib/types";
import {
  blockPlacement,
  minutesAtOffset,
  selectionRange,
  toInputTime,
  visibleRange,
  WEEK_GRID,
} from "@/lib/week-grid";
import { availabilitySchema } from "@/lib/validation/availability";

const labelClass = "text-[11px] uppercase tracking-widest text-muted-foreground";

type Drag = { weekday: number; anchor: number; current: number; moved: boolean };
type Draft = { weekday: number; start: string; end: string; label: string };

/**
 * The week as a calendar. Drag across a day to pick the hours (or tap for one hour), name it, save.
 * Existing commitments are blocks you can open to remove. The form below the calendar stays as the
 * keyboard path, since a drag needs a pointer.
 */
export function WeekCalendar({ blocks }: { blocks: AvailabilityBlock[] }) {
  const router = useRouter();
  const [drag, setDrag] = useState<Drag | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [selected, setSelected] = useState<AvailabilityBlock | null>(null);
  const [busy, setBusy] = useState(false);

  const range = visibleRange(blocks);
  const hours = Array.from({ length: (range.end - range.start) / 60 }, (_, i) => range.start / 60 + i);
  const gridHeight = ((range.end - range.start) / 60) * WEEK_GRID.hourHeight;

  const minuteAt = (e: React.PointerEvent<HTMLElement>, column: HTMLElement) =>
    minutesAtOffset(e.clientY - column.getBoundingClientRect().top, range.start);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>, weekday: number) {
    if (e.button !== 0 || e.target !== e.currentTarget) return;
    const at = minuteAt(e, e.currentTarget);
    // Touch keeps scrolling the page, so a tap picks a one hour slot there. Mouse and pen drag.
    if (e.pointerType !== "touch") e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ weekday, anchor: at, current: at, moved: false });
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag || e.pointerType === "touch") return;
    const at = minuteAt(e, e.currentTarget);
    if (at !== drag.current) setDrag({ ...drag, current: at, moved: true });
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    const { start, end } = selectionRange(drag.anchor, drag.current, drag.moved);
    openDraft(drag.weekday, start, end);
    setDrag(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }

  function openDraft(weekday: number, start: number, end: number) {
    setDraft({ weekday, start: toInputTime(start), end: toInputTime(end), label: "" });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft || busy) return;
    const parsed = availabilitySchema.safeParse({
      weekday: draft.weekday,
      start_time: draft.start,
      end_time: draft.end,
      label: draft.label || null,
    });
    if (!parsed.success) {
      toast.error(draft.end <= draft.start ? "End time must be after the start time" : "Check the times");
      return;
    }
    setBusy(true);
    const result = await apiRequest("/api/availability", "POST", parsed.data);
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Commitment added");
    setDraft(null);
    router.refresh();
  }

  async function remove() {
    if (!selected || busy) return;
    setBusy(true);
    const result = await apiRequest(`/api/availability/${selected.id}`, "DELETE");
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Commitment removed");
    setSelected(null);
    router.refresh();
  }

  const preview = drag
    ? selectionRange(drag.anchor, drag.current, drag.moved)
    : null;
  const pxPerMinute = WEEK_GRID.hourHeight / 60;

  return (
    <>
      <p className="mb-3 text-xs text-muted-foreground">
        Drag across a day to pick the hours, or tap for one hour. Tap a block to remove it.
      </p>

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-[3rem_repeat(7,1fr)] border-b">
            <span aria-hidden />
            {WEEKDAY_ORDER.map((d) => (
              <h3
                key={d}
                className="tabular py-2 text-center text-[11px] uppercase tracking-widest text-muted-foreground"
              >
                {WEEKDAY_NAMES[d].slice(0, 3)}
              </h3>
            ))}
          </div>

          <div className="grid grid-cols-[3rem_repeat(7,1fr)]">
            <div className="relative" style={{ height: gridHeight }} aria-hidden>
              {hours.map((h, i) => (
                <span
                  key={h}
                  className="tabular absolute right-2 -translate-y-1/2 text-[10px] text-muted-foreground"
                  style={{ top: i * WEEK_GRID.hourHeight }}
                >
                  {i === 0 ? "" : toTime(h * 60)}
                </span>
              ))}
            </div>

            {WEEKDAY_ORDER.map((weekday) => (
              <div
                key={weekday}
                role="group"
                aria-label={WEEKDAY_NAMES[weekday]}
                onPointerDown={(e) => onPointerDown(e, weekday)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={() => setDrag(null)}
                className="relative cursor-crosshair select-none border-l [touch-action:pan-y]"
                style={{
                  height: gridHeight,
                  backgroundImage:
                    "linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
                  backgroundSize: `100% ${WEEK_GRID.hourHeight}px`,
                }}
              >
                {blocks
                  .filter((b) => b.weekday === weekday)
                  .map((b) => {
                    const { top, height } = blockPlacement(b, range.start);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelected(b)}
                        aria-label={`${b.label ?? "Commitment"} on ${WEEKDAY_NAMES[b.weekday]}, ${b.start_time} to ${b.end_time}`}
                        className="absolute inset-x-0.5 cursor-pointer overflow-hidden border border-primary/60 bg-primary/20 px-1 py-0.5 text-left text-[10px] leading-tight hover:bg-primary/30"
                        style={{ top, height }}
                      >
                        <span className="tabular block">{b.start_time}</span>
                        {b.label && <span className="block truncate text-muted-foreground">{b.label}</span>}
                      </button>
                    );
                  })}

                {preview && drag?.weekday === weekday && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0.5 border border-dashed border-primary bg-primary/10"
                    style={{
                      top: (preview.start - range.start) * pxPerMinute,
                      height: (preview.end - preview.start) * pxPerMinute,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent>
          <form onSubmit={save} className="flex flex-col gap-4" noValidate>
            <DialogHeader>
              <DialogTitle>New commitment</DialogTitle>
              <DialogDescription>
                {draft ? `Every ${WEEKDAY_NAMES[draft.weekday]}. Adjust the times if needed.` : ""}
              </DialogDescription>
            </DialogHeader>
            {draft && (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="wc-start" className={labelClass}>From</Label>
                  <Input
                    id="wc-start"
                    type="time"
                    value={draft.start}
                    onChange={(e) => setDraft({ ...draft, start: e.target.value })}
                    className="tabular h-11"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="wc-end" className={labelClass}>Until</Label>
                  <Input
                    id="wc-end"
                    type="time"
                    value={draft.end}
                    onChange={(e) => setDraft({ ...draft, end: e.target.value })}
                    className="tabular h-11"
                  />
                </div>
                <div className="col-span-2 flex flex-col gap-2">
                  <Label htmlFor="wc-label" className={labelClass}>Label (optional)</Label>
                  <Input
                    id="wc-label"
                    value={draft.label}
                    maxLength={60}
                    autoFocus
                    onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                    className="h-11"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDraft(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Adding" : "Add commitment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.label ?? "Commitment"}</DialogTitle>
            <DialogDescription>
              {selected
                ? `Every ${WEEKDAY_NAMES[selected.weekday]}, ${selected.start_time} to ${selected.end_time} (${toMinutes(selected.end_time) - toMinutes(selected.start_time)} minutes).`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSelected(null)}>
              Close
            </Button>
            <Button type="button" variant="destructive" onClick={remove} disabled={busy}>
              {busy ? "Removing" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
