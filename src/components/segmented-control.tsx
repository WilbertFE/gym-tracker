"use client";

import { cn } from "@/lib/utils";

type Option<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  /** Lay the options out in this many columns and wrap, instead of one row. */
  columns?: number;
};

/** Small mutually exclusive toggle with 44px tap targets. */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
  columns,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("inline-grid gap-1", columns ? "" : "auto-cols-fr grid-flow-col", className)}
      style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "min-h-11 border px-4 text-sm transition-colors",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-surface text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
