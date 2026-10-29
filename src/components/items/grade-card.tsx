import type { CSSProperties, ElementType, ReactNode } from "react";
import { gradePips } from "@/lib/item-art";
import { GRADES, type Grade } from "@/lib/items";
import { cn } from "@/lib/utils";

type GradeCardProps = {
  grade: Grade;
  children: ReactNode;
  className?: string;
  /** The element to render, a `li` in a list for example. */
  as?: ElementType;
  /** A card that is not found yet, so it is drawn faint. */
  dim?: boolean;
};

/**
 * A card that wears its grade: flat for Common, a green edge for Uncommon, an inner glow for Rare, a gradient edge and brackets for Epic, a
 * double gold edge with a gem for Legendary. The look is in `globals.css` (`.item-card`).
 */
export function GradeCard({ grade, children, className, as: Tag = "div", dim = false }: GradeCardProps) {
  return (
    <Tag
      className={cn("item-card", dim && "opacity-60", className)}
      data-grade={grade}
      style={{ "--grade": GRADES[grade].color } as CSSProperties}
    >
      {(grade === "legendary" || grade === "mythic") && <span aria-hidden className="item-gem" />}
      {(grade === "epic" || grade === "legendary" || grade === "mythic") && (
        <span aria-hidden className="item-shine-wrap">
          <span className="item-shine" />
        </span>
      )}
      {children}
    </Tag>
  );
}

/** The grade name with its diamonds, in the grade colour. */
export function GradeLabel({ grade, className }: { grade: Grade; className?: string }) {
  return (
    <span
      className={cn("tabular inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest", className)}
      style={{ color: GRADES[grade].color, "--grade": GRADES[grade].color } as CSSProperties}
    >
      <span aria-hidden className="item-pips">
        {Array.from({ length: gradePips(grade) }, (_, i) => (
          <span key={i} />
        ))}
      </span>
      {GRADES[grade].name}
    </span>
  );
}
