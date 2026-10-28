import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PanelProps = {
  label: string;
  /** `system` is the glowing System window, for the cards that speak as the System. */
  variant?: "plain" | "system";
  children: ReactNode;
  className?: string;
};

/** HUD card: 1px border, surface background, small uppercase label top left. */
export function Panel({ label, children, className, variant = "plain" }: PanelProps) {
  const system = variant === "system";
  return (
    <section className={cn(system ? "system-window p-4" : "border bg-card p-4", className)}>
      <h2 className={cn("tabular mb-3 text-[11px] uppercase tracking-widest", system ? "text-primary" : "text-muted-foreground")}>
        {label}
      </h2>
      {children}
    </section>
  );
}
