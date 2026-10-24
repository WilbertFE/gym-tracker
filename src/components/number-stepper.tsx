"use client";

import { MinusIcon, PlusIcon } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type NumberStepperProps = {
  id: string;
  label: string;
  unit?: string;
  value: string;
  onChange: (value: string) => void;
  step: number;
  min?: number;
  max?: number;
};

const btn =
  "flex size-12 shrink-0 items-center justify-center border bg-surface text-muted-foreground transition-colors hover:text-foreground active:bg-surface-raised disabled:opacity-40";

/** Big tap targets for use between sets: minus, typed value, plus. */
export function NumberStepper({
  id,
  label,
  unit,
  value,
  onChange,
  step,
  min = 0,
  max = 1000,
}: NumberStepperProps) {
  const current = value === "" ? NaN : Number(value);

  function bump(direction: 1 | -1) {
    const base = Number.isFinite(current) ? current : 0;
    const next = Math.min(max, Math.max(min, Math.round((base + direction * step) * 100) / 100));
    onChange(String(next));
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
        {unit && <span className="ml-1 normal-case tracking-normal">({unit})</span>}
      </Label>
      <div className="flex gap-1">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          className={btn}
          onClick={() => bump(-1)}
          disabled={Number.isFinite(current) && current <= min}
        >
          <MinusIcon className="size-4" aria-hidden />
        </button>
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          step="any"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="tabular h-12 min-w-0 flex-1 text-center text-lg"
        />
        <button
          type="button"
          aria-label={`Increase ${label}`}
          className={btn}
          onClick={() => bump(1)}
          disabled={Number.isFinite(current) && current >= max}
        >
          <PlusIcon className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
