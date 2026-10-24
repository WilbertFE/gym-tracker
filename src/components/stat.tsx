import { cn } from "@/lib/utils";

type StatProps = {
  label: string;
  value: string | number;
  unit?: string;
  className?: string;
};

/** Data first: large mono number, small uppercase label, muted unit. */
export function Stat({ label, value, unit, className }: StatProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="tabular text-4xl font-medium leading-none">
        {value}
        {unit && <span className="ml-1 text-sm text-muted-foreground">{unit}</span>}
      </span>
    </div>
  );
}
