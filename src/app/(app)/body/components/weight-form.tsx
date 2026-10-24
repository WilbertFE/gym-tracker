"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api-client";
import { weightSchema, type WeightInput } from "@/lib/validation/weight";

export function WeightForm({ today }: { today: string }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WeightInput>({
    resolver: zodResolver(weightSchema),
    defaultValues: { date: today },
  });

  async function onSubmit(values: WeightInput) {
    const result = await apiRequest("/api/weights", "POST", {
      ...values,
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
          Weight (kg)
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
