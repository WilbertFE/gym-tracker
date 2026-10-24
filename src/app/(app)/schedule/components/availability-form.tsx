"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/api-client";
import { WEEKDAY_NAMES, WEEKDAY_ORDER } from "@/lib/scheduling";
import { availabilitySchema } from "@/lib/validation/availability";

const labelClass = "text-[11px] uppercase tracking-widest text-muted-foreground";

export function AvailabilityForm() {
  const router = useRouter();
  const [weekday, setWeekday] = useState("1");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [label, setLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const parsed = availabilitySchema.safeParse({
      weekday: Number(weekday),
      start_time: start,
      end_time: end,
      label: label || null,
    });
    if (!parsed.success) {
      toast.error(end <= start ? "End time must be after the start time" : "Check the times");
      return;
    }

    setSubmitting(true);
    const result = await apiRequest("/api/availability", "POST", parsed.data);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Commitment added");
    setLabel("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-2 gap-4 sm:grid-cols-4" noValidate>
      <div className="col-span-2 flex flex-col gap-2 sm:col-span-1">
        <span className={labelClass}>Day</span>
        <Select value={weekday} onValueChange={setWeekday}>
          <SelectTrigger className="h-11 w-full" aria-label="Day of the week">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WEEKDAY_ORDER.map((d) => (
              <SelectItem key={d} value={String(d)}>
                {WEEKDAY_NAMES[d]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="av-start" className={labelClass}>From</Label>
        <Input id="av-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} className="tabular h-11" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="av-end" className={labelClass}>Until</Label>
        <Input id="av-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="tabular h-11" />
      </div>

      <div className="col-span-2 flex flex-col gap-2 sm:col-span-1">
        <Label htmlFor="av-label" className={labelClass}>Label (optional)</Label>
        <Input id="av-label" value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} className="h-11" />
      </div>

      <Button type="submit" className="col-span-2 h-11 sm:col-span-4" disabled={submitting}>
        {submitting ? "Adding" : "Add commitment"}
      </Button>
    </form>
  );
}
