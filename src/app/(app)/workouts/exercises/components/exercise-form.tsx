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
import { MUSCLE_GROUPS, MUSCLE_LABELS, type MuscleGroup } from "@/lib/muscles";
import { cn } from "@/lib/utils";
import { exerciseSchema } from "@/lib/validation/workout";

const labelClass = "text-[11px] uppercase tracking-widest text-muted-foreground";

export function ExerciseForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [equipment, setEquipment] = useState("");
  const [primary, setPrimary] = useState<MuscleGroup | "">("");
  const [secondary, setSecondary] = useState<MuscleGroup[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function toggleSecondary(m: MuscleGroup) {
    setSecondary((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const parsed = exerciseSchema.safeParse({
      name,
      primary_muscle: primary,
      secondary_muscles: secondary.filter((m) => m !== primary),
      equipment: equipment || null,
    });
    if (!parsed.success) {
      toast.error("Enter a name and choose the primary muscle");
      return;
    }

    setSubmitting(true);
    const result = await apiRequest("/api/exercises", "POST", parsed.data);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Exercise added");
    setName("");
    setEquipment("");
    setPrimary("");
    setSecondary([]);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor="ex-name" className={labelClass}>Name</Label>
        <Input id="ex-name" className="h-11" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="ex-equipment" className={labelClass}>Equipment (optional)</Label>
        <Input id="ex-equipment" className="h-11" value={equipment} maxLength={40} onChange={(e) => setEquipment(e.target.value)} />
      </div>

      <div className="flex flex-col gap-2 sm:col-span-2">
        <span className={labelClass}>Primary muscle</span>
        <Select value={primary} onValueChange={(v) => setPrimary(v as MuscleGroup)}>
          <SelectTrigger className="h-11 w-full" aria-label="Primary muscle">
            <SelectValue placeholder="Choose a muscle group" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {MUSCLE_GROUPS.map((m) => (
              <SelectItem key={m} value={m}>{MUSCLE_LABELS[m]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2 sm:col-span-2">
        <span className={labelClass}>Secondary muscles (optional)</span>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Secondary muscles">
          {MUSCLE_GROUPS.filter((m) => m !== primary).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={secondary.includes(m)}
              onClick={() => toggleSecondary(m)}
              className={cn(
                "min-h-11 border px-3 text-xs transition-colors",
                secondary.includes(m)
                  ? "border-primary text-foreground"
                  : "bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              {MUSCLE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      <Button type="submit" className="h-11 sm:col-span-2" disabled={submitting}>
        {submitting ? "Adding" : "Add exercise"}
      </Button>
    </form>
  );
}
