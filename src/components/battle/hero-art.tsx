import type { CSSProperties } from "react";
import { AuraArt } from "@/components/items/aura-art";
import { RankBadge } from "@/components/rank-badge";
import { auraKindFor } from "@/lib/item-art";
import { itemById, type Equipment, type FrameStyle } from "@/lib/items";
import type { Rank } from "@/lib/ranks";
import { cn } from "@/lib/utils";

export type HeroState = "idle" | "attack" | "hurt" | "win";

const C = {
  line: "#16233f",
  skin: "#f1d3c4",
  skinShade: "#d9ad9b",
  armor: "#0d1930",
  armorMid: "#17284b",
  armorLight: "#1f3562",
  piping: "#4aa8ff",
  hair: "#6f8fd0",
  hairDark: "#4b69a6",
  boot: "#0a1224",
  blade: "#8fd0ff",
  bladeCore: "#ffffff",
} as const;

type HeroArtProps = {
  state?: HeroState;
  /** Width in pixels. The height follows. */
  size?: number;
  className?: string;
};

/**
 * The hero, a fighter in the System jacket's colors with a blade of light, facing right toward the monster. Pure inline
 * SVG, in layers (legs, torso, back arm, head, front arm, blade) so a weapon or an outfit can replace one layer later.
 * What she is doing (`state`) is moved by CSS. The chest is left open for the rank badge, which `HeroFigure` lays on it.
 */
export function HeroArt({ state = "idle", size = 240, className }: HeroArtProps) {
  return (
    <svg
      viewBox="0 0 240 260"
      width={size}
      height={(size * 260) / 240}
      aria-hidden
      focusable="false"
      className={cn("battle-hero block overflow-visible", className)}
      data-state={state}
    >
      <ellipse cx={116} cy={250} rx={62} ry={6} fill="#000" opacity={0.4} />

      <g className="battle-hero-body" stroke={C.line} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round">
        {/* Legs and boots */}
        <path d="M96 168 L92 236 H70 L72 246 H114 L110 168 Z" fill={C.armorMid} />
        <path d="M124 168 L134 236 H122 L122 246 H168 L164 232 L146 168 Z" fill={C.armor} />
        <path d="M70 236 H92 V246 H72 Z M124 236 H146 L164 232 V246 H122 Z" fill={C.boot} />
        <path d="M97 178 L93 226 M133 178 L142 226" stroke={C.piping} strokeWidth={2} fill="none" opacity={0.7} />

        {/* The back arm, behind the body */}
        <path d="M92 114 L74 144 L84 168" fill="none" stroke={C.line} strokeWidth={17} />
        <path d="M92 114 L74 144 L84 168" fill="none" stroke={C.armorMid} strokeWidth={12} />
        <circle cx={85} cy={171} r={8} fill={C.skin} />

        {/* Torso: a fitted jacket with a belt, the chest left open for the badge */}
        <path d="M88 100 Q120 90 152 100 L158 170 H82 Z" fill={C.armor} />
        <path d="M96 104 Q120 96 144 104 L148 128 Q120 138 92 128 Z" fill={C.armorLight} stroke="none" />
        <path d="M82 158 H158 V170 H82 Z" fill={C.armorMid} />
        <rect x={112} y={158} width={16} height={12} rx={2} fill={C.armor} stroke={C.piping} strokeWidth={2} />
        <path d="M100 100 L120 132 L140 100" fill="none" stroke={C.piping} strokeWidth={2.2} />
        <path d="M86 108 Q82 140 90 168" fill="none" stroke={C.piping} strokeWidth={1.8} opacity={0.6} />

        {/* Head */}
        <rect x={110} y={90} width={20} height={14} rx={4} fill={C.skinShade} />
        <circle cx={120} cy={70} r={25} fill={C.skin} />
        <path d="M94 68 Q94 40 120 40 Q148 40 146 70 Q140 56 126 54 Q108 54 94 68 Z" fill={C.hair} />
        <path d="M94 68 L88 92 L100 84 Z" fill={C.hairDark} />
        <path d="M96 66 H144" stroke={C.piping} strokeWidth={5} fill="none" />
        <path d="M96 66 H144" stroke="#ffffff" strokeWidth={1.4} fill="none" opacity={0.7} />
        <circle cx={132} cy={78} r={2.6} fill={C.line} stroke="none" />
        <path d="M126 88 Q132 91 138 88" fill="none" strokeWidth={2.2} />

        {/* The front arm and the blade, swung from the hand */}
        <g className="battle-hero-arm">
          <path d="M148 112 L170 138 L172 156" fill="none" stroke={C.line} strokeWidth={17} />
          <path d="M148 112 L170 138 L172 156" fill="none" stroke={C.armorLight} strokeWidth={12} />
          <path d="M150 116 L168 138" fill="none" stroke={C.piping} strokeWidth={1.6} opacity={0.7} />
          <circle cx={172} cy={158} r={8.5} fill={C.skin} />
          <g className="battle-hero-blade">
            <path d="M172 164 L172 150 L226 52 L232 60 Z" fill={C.blade} opacity={0.4} stroke="none" />
            <path d="M172 158 L226 56" stroke={C.blade} strokeWidth={9} strokeLinecap="round" opacity={0.55} />
            <path d="M172 158 L226 56" stroke={C.bladeCore} strokeWidth={3.4} strokeLinecap="round" />
            <path d="M160 150 L184 162" stroke={C.line} strokeWidth={7} strokeLinecap="round" />
            <path d="M160 150 L184 162" stroke={C.piping} strokeWidth={3.2} strokeLinecap="round" />
          </g>
        </g>
      </g>
    </svg>
  );
}

type HeroFigureProps = {
  rank: Rank;
  /** What is worn: the frame around the badge and the aura around the figure. */
  equipment: Equipment;
  state?: HeroState;
  /** The height in pixels. */
  size?: number;
  className?: string;
};

/**
 * You as the hero: the figure standing in the aura you wear, with your rank badge (and the frame you wear) on her chest.
 * The aura and frame come from the same items as the Collection page, so what you win there shows up here.
 */
export function HeroFigure({ rank, equipment, state = "idle", size = 240, className }: HeroFigureProps) {
  const aura = equipment.aura ? itemById(equipment.aura) : null;
  const frame = equipment.frame ? itemById(equipment.frame) : null;
  const width = (size * 240) / 260;
  const badge = (
    // The badge sits on the chest, where the jacket was left open for it.
    <span
      aria-hidden
      className="pointer-events-none absolute"
      style={{ left: `${(120 / 240) * 100}%`, top: `${(134 / 260) * 100}%`, transform: "translate(-50%, -50%)" } as CSSProperties}
    >
      <RankBadge rank={rank} size={Math.round(size * 0.17)} decor={(frame?.value as FrameStyle | undefined) ?? null} />
    </span>
  );
  const figure = (
    <span className={cn("battle-hero-wrap relative inline-block", className)} style={{ width, height: size }} data-state={state}>
      <HeroArt state={state} size={width} />
      {badge}
    </span>
  );

  if (!aura) return figure;
  return (
    <AuraArt color={aura.value} kind={auraKindFor(aura.id)} size={Math.round(size * 0.98)}>
      {figure}
    </AuraArt>
  );
}
