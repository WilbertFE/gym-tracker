import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PanelProps = {
  label: string;
  /** `plain` is the quiet System window, `system` the glowing one for cards that speak as the System, `danger` the red one for bosses. */
  variant?: "plain" | "system" | "danger";
  children: ReactNode;
  className?: string;
};

/** HUD card: a System window with a bracketed label in the display face. */
export function Panel({ label, children, className, variant = "plain" }: PanelProps) {
  const plain = variant === "plain";
  return (
    <section
      className={cn("system-window p-4", className)}
      data-glow={plain ? undefined : ""}
      data-danger={variant === "danger" ? "" : undefined}
    >
      <h2
        className={cn(
          "font-display mb-3 text-[11px] font-semibold uppercase tracking-[0.2em]",
          plain ? "text-muted-foreground" : "text-primary",
        )}
      >
        [ {label} ]
      </h2>
      {children}
    </section>
  );
}
