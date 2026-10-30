import { useId } from "react";
import { cn } from "@/lib/utils";

export type MonsterState = "idle" | "hit" | "strike" | "down";

const C = {
  line: "#16233f",
  steel: "#33445f",
  steelLight: "#4d6587",
  steelDark: "#222f45",
  rust: "#8a5a3a",
  rustDark: "#5c3b27",
  ember: "#ffb347",
  emberDeep: "#ff7a1a",
  crack: "#0a101c",
} as const;

type MonsterArtProps = {
  state?: MonsterState;
  /** 0 to 1, the share of its HP left. Cracks spread across it as it falls. */
  hp?: number;
  /** Width in pixels. The height follows. */
  size?: number;
  className?: string;
};

/**
 * The Iron Golem, a wall of old riveted plates with an ember for a heart, facing left toward the hero. Pure inline SVG
 * in the System palette. Its look follows what it is doing (`state`, moved by CSS) and how hurt it is (`hp`).
 */
export function MonsterArt({ state = "idle", hp = 1, size = 240, className }: MonsterArtProps) {
  const uid = useId().replace(/:/g, "");
  const down = state === "down";
  // Cracks show once it is hurt: one at 75 percent, two at 50, three at 25, all of them when it falls.
  const cracks = down ? 3 : hp <= 0.25 ? 3 : hp <= 0.5 ? 2 : hp <= 0.75 ? 1 : 0;

  return (
    <svg
      viewBox="0 0 240 260"
      width={size}
      height={(size * 260) / 240}
      aria-hidden
      focusable="false"
      className={cn("battle-monster block overflow-visible", className)}
      data-state={state}
    >
      <defs>
        <radialGradient id={`${uid}-core`}>
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset="0.45" stopColor={C.ember} />
          <stop offset="1" stopColor={C.emberDeep} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`${uid}-plate`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.steelLight} />
          <stop offset="1" stopColor={C.steel} />
        </linearGradient>
      </defs>

      <ellipse cx={120} cy={250} rx={92} ry={7} fill="#000" opacity={0.4} />

      <g className="battle-monster-body">
        {/* Legs */}
        <g stroke={C.line} strokeWidth={3} strokeLinejoin="round">
          <rect x={66} y={196} width={48} height={52} rx={6} fill={C.steelDark} />
          <rect x={126} y={196} width={48} height={52} rx={6} fill={C.steelDark} />
          <path d="M62 238 H118 V250 H58 Z M122 238 H178 V250 H182 Z" fill={C.rustDark} />
        </g>

        {/* Arms, with the near fist raised to strike */}
        <g stroke={C.line} strokeWidth={3} strokeLinejoin="round">
          <g className="battle-monster-fist">
            <rect x={14} y={120} width={44} height={96} rx={8} fill={`url(#${uid}-plate)`} />
            <rect x={6} y={206} width={62} height={46} rx={8} fill={C.steelLight} />
            <path d="M14 224 H60 M18 214 H56" stroke={C.steelDark} strokeWidth={2} fill="none" />
          </g>
          <rect x={182} y={120} width={44} height={92} rx={8} fill={`url(#${uid}-plate)`} />
          <rect x={174} y={204} width={60} height={44} rx={8} fill={C.steelLight} />
        </g>

        {/* Torso: a trapezoid of plates held by rivets */}
        <g stroke={C.line} strokeWidth={3} strokeLinejoin="round">
          <path d="M58 106 H182 L196 206 H44 Z" fill={`url(#${uid}-plate)`} />
          <path d="M52 156 H188 M48 182 H192" stroke={C.steelDark} strokeWidth={2.4} fill="none" />
          <ellipse cx={74} cy={176} rx={20} ry={10} fill={C.rust} opacity={0.55} stroke="none" />
          <ellipse cx={168} cy={134} rx={16} ry={8} fill={C.rustDark} opacity={0.6} stroke="none" />
        </g>
        {[[70, 120], [170, 120], [64, 168], [176, 168], [60, 196], [180, 196]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={3} fill={C.steelDark} stroke={C.line} strokeWidth={1.4} />
        ))}

        {/* The ember heart, dark once it has fallen */}
        <g>
          <circle cx={120} cy={146} r={24} fill={`url(#${uid}-core)`} opacity={down ? 0.1 : 1} className={cn(!down && "battle-core")} />
          <circle cx={120} cy={146} r={11} fill={down ? C.steelDark : C.ember} stroke={C.line} strokeWidth={2.4} />
        </g>

        {/* Shoulders */}
        <g stroke={C.line} strokeWidth={3} strokeLinejoin="round">
          <path d="M26 112 Q26 92 52 92 H82 V126 H30 Z" fill={C.steelLight} />
          <path d="M214 112 Q214 92 188 92 H158 V126 H210 Z" fill={C.steelLight} />
          <path d="M34 108 H74 M206 108 H166" stroke={C.rust} strokeWidth={3} fill="none" opacity={0.8} />
        </g>

        {/* Head: a block with a brow and two ember slits */}
        <g stroke={C.line} strokeWidth={3} strokeLinejoin="round">
          <rect x={88} y={44} width={64} height={60} rx={8} fill={C.steel} />
          <path d="M84 62 H156 V76 H84 Z" fill={C.steelDark} />
          <path d="M100 100 H140 M104 94 H136" stroke={C.steelDark} strokeWidth={2.4} fill="none" />
        </g>
        <path d="M98 69 H114 M126 69 H142" stroke={down ? C.steelLight : C.ember} strokeWidth={6} strokeLinecap="round" className={cn(!down && "battle-eyes")} />

        {/* Cracks, more of them as it is hurt */}
        <g stroke={C.crack} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round">
          {cracks >= 1 && <path d="M96 106 L108 128 L98 146 L112 168" />}
          {cracks >= 2 && <path d="M164 110 L152 134 L166 152 L150 178 M152 134 L138 132" />}
          {cracks >= 3 && <path d="M120 44 L116 62 L126 74 M70 128 L82 148 L72 170 M174 176 L160 190" />}
        </g>
      </g>
    </svg>
  );
}
