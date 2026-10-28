"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api-client";
import { toKg, type WeightUnit } from "@/lib/units";
import { z } from "zod";
import { weightSchema, type WeightInput } from "@/lib/validation/weight";

/** The same limits as the server (20 to 500 kg) expressed in the unit the user types. */
const LIMITS: Record<WeightUnit, [number, number]> = { kg: [20, 500], lb: [44, 1100] };

export function WeightForm({ today, unit }: { today: string; unit: WeightUnit }) {
  const router = useRouter();
  const schema = useMemo(() => {
    const [min, max] = LIMITS[unit];
    return weightSchema.extend({
      weight_kg: z.number("Enter a number").min(min, `At least ${min} ${unit}`).max(max, `At most ${max} ${unit}`),
    });
  }, [unit]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WeightInput>({
    resolver: zodResolver(schema),
    defaultValues: { date: today },
  });

  async function onSubmit(values: WeightInput) {
    const result = await apiRequest("/api/weights", "POST", {
      ...values,
      weight_kg: toKg(values.weight_kg, unit),
      notes: values.notes || null,
    });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Weight logged");
    reset({ date: today, weight_kg: undefined, notes: "" });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="weight_kg" className="text-[11px] uppercase tracking-widest text-muted-foreground">
          Weight ({unit})
        </Label>
        <Input
          id="weight_kg"
          type="number"
          inputMode="decimal"
          step="0.1"
          className="tabular h-11"
          aria-invalid={!!errors.weight_kg}
          {...register("weight_kg", { valueAsNumber: true })}
        />
        {errors.weight_kg && <p className="text-xs text-destructive">{errors.weight_kg.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="date" className="text-[11px] uppercase tracking-widest text-muted-foreground">
          Date
        </Label>
        <Input
          id="date"
          type="date"
          className="tabular h-11"
          aria-invalid={!!errors.date}
          {...register("date")}
        />
        {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
      </div>

      <Button type="submit" className="h-11 sm:mt-[1.625rem]" disabled={isSubmitting}>
        {isSubmitting ? "Saving" : "Log weight"}
      </Button>
    </form>
  );
}
