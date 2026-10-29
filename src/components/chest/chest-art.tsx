import { cn } from "@/lib/utils";
import type { ChestKind } from "@/lib/chests";

export type ChestPhase = "idle" | "shaking" | "opening" | "reveal";

/** The two chests are the same shape. The weekly one is reinforced with straps and a brighter rim. */
const LOOKS: Record<ChestKind, { body: string; rim: string; strap: string }> = {
  daily: { body: "#0c1629", rim: "#2a4570", strap: "#142544" },
  weekly: { body: "#0f1b36", rim: "#5b7fb8", strap: "#1f3d72" },
};

/**
 * The chest, drawn as inline SVG so it is sharp at any size. The lid is a separate element so it can tip open
 * in 3D, and the glow between lid and body takes its color from `--glow`, set by the stage around it.
 */
export function ChestArt({ kind, phase }: { kind: ChestKind; phase: ChestPhase }) {
  const look = LOOKS[kind];
  const open = phase === "opening" || phase === "reveal";

  return (
    <div
      className={cn("relative h-[190px] w-[220px]", phase === "idle" && "chest-float", phase === "shaking" && "chest-shake")}
      aria-hidden
    >
      <svg viewBox="0 0 220 190" width={220} height={190} className="absolute inset-0">
        <ellipse cx={110} cy={178} rx={86} ry={7} fill="#000" opacity={0.45} />
        <rect x={30} y={84} width={160} height={86} rx={5} fill={look.body} stroke={look.rim} strokeWidth={3} />
        <rect x={34} y={142} width={152} height={5} fill={look.strap} />
        {kind === "weekly" && (
          <>
            <rect x={64} y={87} width={12} height={80} fill={look.strap} stroke={look.rim} strokeWidth={1.5} />
            <rect x={144} y={87} width={12} height={80} fill={look.strap} stroke={look.rim} strokeWidth={1.5} />
          </>
        )}
        {/* corner brackets, the same ones the System windows carry */}
        <path d="M30 100 V84 H46 M190 100 V84 H174 M30 154 V170 H46 M190 154 V170 H174" fill="none" stroke="var(--glow)" strokeWidth={3} opacity={0.9} />
        <rect x={98} y={104} width={24} height={30} rx={3} fill={look.strap} stroke={look.rim} strokeWidth={2} />
        <circle cx={110} cy={116} r={4} fill="var(--glow)" />
        <rect x={108.5} y={118} width={3} height={9} fill="var(--glow)" />
      </svg>

      {/* The inside, lit from within once the lid is up. */}
      {open && (
        <div
          className="absolute left-[34px] right-[34px] top-[78px] h-[18px]"
          style={{ background: "radial-gradient(ellipse at 50% 100%, var(--glow), transparent 70%)", filter: "blur(2px)" }}
        />
      )}

      <div
        className={cn("absolute left-0 top-0 h-[86px] w-[220px]", phase === "opening" && "chest-lid-open")}
        style={{ transformOrigin: "50% 100%", transform: open ? "perspective(520px) rotateX(-108deg)" : undefined }}
      >
        <svg viewBox="0 0 220 86" width={220} height={86}>
          <path d="M30 86 V58 Q30 22 70 22 H150 Q190 22 190 58 V86 Z" fill={look.body} stroke={look.rim} strokeWidth={3} strokeLinejoin="round" />
          <path d="M44 34 Q60 28 80 28 H140" fill="none" stroke={look.rim} strokeWidth={2} strokeLinecap="round" opacity={0.7} />
          {kind === "weekly" && (
            <>
              <rect x={64} y={24} width={12} height={62} fill={look.strap} stroke={look.rim} strokeWidth={1.5} />
              <rect x={144} y={24} width={12} height={62} fill={look.strap} stroke={look.rim} strokeWidth={1.5} />
            </>
          )}
        </svg>
      </div>

      {/* The glow along the seam. It builds while the chest shakes. */}
      <div
        className={cn("absolute left-[30px] right-[30px] top-[83px] h-[4px]", phase === "shaking" && "chest-seam-build")}
        style={{
          background: "var(--glow)",
          boxShadow: "0 0 14px var(--glow), 0 0 34px var(--glow)",
          opacity: phase === "idle" ? 0.45 : 1,
        }}
      />
    </div>
  );
}
