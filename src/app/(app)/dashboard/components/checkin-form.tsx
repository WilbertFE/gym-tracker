"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScaleSelect } from "@/components/scale-select";
import { apiRequest } from "@/lib/api-client";
import type { Checkin } from "@/lib/types";
import { cn } from "@/lib/utils";
import { checkinSchema } from "@/lib/validation/checkin";

type CheckinFormProps = {
  today: string;
  existing: Checkin | null;
};

export function CheckinForm({ today, existing }: CheckinFormProps) {
  const router = useRouter();
  const [wentToGym, setWentToGym] = useState(existing?.went_to_gym ?? true);
  const [mood, setMood] = useState<number | null>(existing?.mood ?? null);
  const [energy, setEnergy] = useState<number | null>(existing?.energy ?? null);
  const [sleep, setSleep] = useState(existing?.sleep_hours?.toString() ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const parsed = checkinSchema.safeParse({
      date: today,
      went_to_gym: wentToGym,
      mood,
      energy,
      sleep_hours: sleep === "" ? null : Number(sleep),
      notes: existing?.notes ?? null,
    });
    if (!parsed.success) {
      toast.error("Sleep must be between 0 and 24 hours");
      return;
    }

    setSubmitting(true);
    const result = await apiRequest("/api/checkins", "POST", parsed.data);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(existing ? "Check-in updated" : "Checked in");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
          Went to the gym today
        </span>
        <div role="radiogroup" aria-label="Went to the gym today" className="grid grid-cols-2 gap-1">
          {[
            { label: "Yes", value: true },
            { label: "Rest day", value: false },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              role="radio"
              aria-checked={wentToGym === opt.value}
              onClick={() => setWentToGym(opt.value)}
              className={cn(
                "min-h-11 border text-sm transition-colors",
                wentToGym === opt.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <details open={Boolean(existing?.mood || existing?.energy || existing?.sleep_hours)} className="group">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm text-muted-foreground hover:text-foreground">
          Add mood, energy and sleep (optional)
        </summary>
        <div className="flex flex-col gap-4 pb-2 pt-2">
        <div className="grid gap-4 sm:grid-cols-2">
          <ScaleSelect label="Mood" value={mood} onChange={setMood} />
          <ScaleSelect label="Energy" value={energy} onChange={setEnergy} />
        </div>

        <div className="flex flex-col gap-2 sm:max-w-40">
          <Label
            htmlFor="sleep"
            className="text-[11px] uppercase tracking-widest text-muted-foreground"
          >
            Sleep (hours)
          </Label>
          <Input
            id="sleep"
            type="number"
            inputMode="decimal"
            step="0.5"
            min="0"
            max="24"
            className="tabular h-11"
            value={sleep}
            onChange={(e) => setSleep(e.target.value)}
          />
        </div>
        </div>
      </details>

      <Button type="submit" className="h-11" disabled={submitting}>
        {submitting ? "Saving" : existing ? "Update check-in" : "Check in"}
      </Button>
    </form>
  );
}
