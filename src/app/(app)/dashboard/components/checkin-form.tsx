"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScaleSelect } from "@/components/scale-select";
import { apiRequest } from "@/lib/api-client";
import { getCurrentPosition } from "@/lib/browser-location";
import { CHECKIN_KIND_LABELS, CHECKIN_KINDS, type CheckinKind } from "@/lib/checkin-kind";
import { GYM_RADIUS_METERS } from "@/lib/gym-location";
import type { Checkin } from "@/lib/types";
import { cn } from "@/lib/utils";
import { checkinSchema } from "@/lib/validation/checkin";

type CheckinFormProps = {
  today: string;
  existing: Checkin | null;
  /** Name of the gym to check in at, or null with no membership. */
  gymName: string | null;
  /** Whether the gym has a pin on the map. Without one a gym check-in cannot be verified. */
  gymPinned: boolean;
};

export function CheckinForm({ today, existing, gymName, gymPinned }: CheckinFormProps) {
  const router = useRouter();
  const [kind, setKind] = useState<CheckinKind>(existing?.kind ?? "gym");
  const [mood, setMood] = useState<number | null>(existing?.mood ?? null);
  const [energy, setEnergy] = useState<number | null>(existing?.energy ?? null);
  const [sleep, setSleep] = useState(existing?.sleep_hours?.toString() ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // A day that is already a gym check-in was verified when it was made, so editing it needs no location.
  const needsLocation = kind === "gym" && existing?.kind !== "gym";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const parsed = checkinSchema.safeParse({
      date: today,
      kind,
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
    setProblem(null);

    let position: { latitude: number; longitude: number; accuracy: number } | null = null;
    if (needsLocation) {
      setLocating(true);
      const found = await getCurrentPosition();
      setLocating(false);
      if (!found.ok) {
        setSubmitting(false);
        setProblem(found.message);
        return;
      }
      position = found;
    }

    const result = await apiRequest("/api/checkins", "POST", { ...parsed.data, ...position });
    setSubmitting(false);

    if (!result.ok) {
      // A failed location check is not a glitch, so it stays on screen instead of a toast that vanishes.
      setProblem(result.error);
      return;
    }
    toast.success(existing ? "Check-in updated" : "Checked in");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
          How did you train today?
        </span>
        <div role="radiogroup" aria-label="How did you train today" className="grid grid-cols-3 gap-1">
          {CHECKIN_KINDS.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={kind === value}
              onClick={() => setKind(value)}
              className={cn(
                "min-h-11 border px-1 text-sm transition-colors",
                kind === value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              {CHECKIN_KIND_LABELS[value]}
            </button>
          ))}
        </div>
      </div>

      {needsLocation && (
        <p className="text-xs text-muted-foreground">
          {gymPinned ? (
            <>
              Your location is checked against {gymName ?? "your gym"}. You need to be within {GYM_RADIUS_METERS} m of it.
            </>
          ) : (
            <>
              To check in at the gym, first pin your gym on the map in{" "}
              <Link href="/membership" className="underline underline-offset-4">
                Membership
              </Link>
              . A home workout or a rest day needs no location.
            </>
          )}
        </p>
      )}

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

      {problem && (
        <p role="alert" className="border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {problem}
        </p>
      )}

      <Button type="submit" className="h-11" disabled={submitting || (needsLocation && !gymPinned)}>
        {locating ? "Checking your location" : submitting ? "Saving" : existing ? "Update check-in" : "Check in"}
      </Button>
    </form>
  );
}
