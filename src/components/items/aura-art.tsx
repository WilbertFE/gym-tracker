import type { CSSProperties, ReactNode } from "react";
import type { AuraKind } from "@/lib/item-art";
import { cn } from "@/lib/utils";

type AuraArtProps = {
  /** The colour of the aura item. */
  color: string;
  kind: AuraKind;
  /** The height of what it surrounds, in pixels. The effect is drawn around that. */
  size: number;
  /** Let it move: rays turn, sparks twinkle. Only for an aura shown large. Reduced motion keeps it still. */
  animated?: boolean;
  children: ReactNode;
  className?: string;
};

const SPARK_ANGLES = [0, 60, 120, 180, 240, 300];

/**
 * The art of an aura, drawn behind and around a badge: a soft halo, thin rings, ice crystals, twinkling sparks or
 * radiant rays, by `kind`. Everything but the children is decorative.
 */
export function AuraArt({ color, kind, size, animated = false, children, className }: AuraArtProps) {
  const sparks = kind === "crystals" || kind === "sparks";
  return (
    <span
      className={cn("aura", className)}
      data-kind={kind}
      data-animated={animated ? "" : undefined}
      style={{ "--aura-c": color, width: size, height: size } as CSSProperties}
    >
      <span aria-hidden className="aura-layer aura-halo" />
      {kind === "rays" && <span aria-hidden className="aura-layer aura-rays" />}
      {(kind === "ring" || kind === "sparks" || kind === "rays") && <span aria-hidden className="aura-layer aura-ring" />}
      {kind === "ring" && <span aria-hidden className="aura-layer aura-ring-outer" />}
      {kind === "halo" && <span aria-hidden className="aura-layer aura-ring-outer" />}
      {kind === "crystals" && <span aria-hidden className="aura-layer aura-dashed" />}
      {sparks &&
        SPARK_ANGLES.map((angle, i) => (
          <span
            key={angle}
            aria-hidden
            className="aura-spark"
            style={{ "--a": `${angle}deg`, "--r": `${Math.round(size * (kind === "crystals" ? 0.64 : 0.6))}px`, "--d": `${(i * 0.4).toFixed(1)}s` } as CSSProperties}
          />
        ))}
      <span className="aura-body">{children}</span>
    </span>
  );
}
