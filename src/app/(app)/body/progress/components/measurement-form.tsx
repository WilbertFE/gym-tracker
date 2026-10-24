"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api-client";
import { MEASUREMENT_FIELDS, type MeasurementKey } from "@/lib/progress";
import { measurementSchema } from "@/lib/validation/progress";

const labelClass = "text-[11px] uppercase tracking-widest text-muted-foreground";

type Values = Record<MeasurementKey, string>;
const EMPTY: Values = {
  chest_cm: "",
  waist_cm: "",
  hips_cm: "",
  arm_cm: "",
  thigh_cm: "",
  body_fat_pct: "",
};

export function MeasurementForm({ today }: { today: string }) {
  const router = useRouter();
  const [date, setDate] = useState(today);
  const [values, setValues] = useState<Values>(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const numbers = Object.fromEntries(
      MEASUREMENT_FIELDS.map(({ key }) => [key, values[key] === "" ? null : Number(values[key])]),
    );
    const parsed = measurementSchema.safeParse({ date, ...numbers });
    if (!parsed.success) {
      const hasAny = Object.values(numbers).some((n) => n !== null);
      toast.error(hasAny ? "Check the values: one is out of range" : "Enter at least one measurement");
      return;
    }

    setSubmitting(true);
    const result = await apiRequest("/api/measurements", "POST", parsed.data);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Measurements saved");
    setValues(EMPTY);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-2 gap-4 sm:grid-cols-3" noValidate>
      <div className="col-span-2 flex flex-col gap-2 sm:col-span-3">
        <Label htmlFor="m-date" className={labelClass}>Date</Label>
        <Input
          id="m-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="tabular h-11 sm:max-w-48"
        />
      </div>

      {MEASUREMENT_FIELDS.map(({ key, label, unit }) => (
        <div key={key} className="flex flex-col gap-2">
          <Label htmlFor={`m-${key}`} className={labelClass}>
            {label} ({unit})
          </Label>
          <Input
            id={`m-${key}`}
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            value={values[key]}
            onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
            className="tabular h-11"
          />
        </div>
      ))}

      <p className="col-span-2 text-xs text-muted-foreground sm:col-span-3">
        All fields are optional, but enter at least one. Saving the same date again replaces that day.
      </p>

      <Button type="submit" className="col-span-2 h-11 sm:col-span-3" disabled={submitting}>
        {submitting ? "Saving" : "Save measurements"}
      </Button>
    </form>
  );
}
