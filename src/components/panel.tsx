import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PanelProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

/** HUD card: 1px border, surface background, small uppercase label top left. */
export function Panel({ label, children, className }: PanelProps) {
  return (
    <section className={cn("border bg-card p-4", className)}>
      <h2 className="tabular mb-3 text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </h2>
      {children}
    </section>
  );
}
