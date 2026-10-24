"use client";

import { cn } from "@/lib/utils";

type ScaleSelectProps = {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  max?: number;
};

/** Tap a number from 1 to max. Tapping the selected number clears it. */
export function ScaleSelect({ label, value, onChange, max = 5 }: ScaleSelectProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-5 gap-1">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(selected ? null : n)}
              className={cn(
                "tabular min-h-11 border text-sm transition-colors",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
