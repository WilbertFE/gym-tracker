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
  armorLight: "#233d70",
  piping: "#4aa8ff",
  scarf: "#2f7fd6",
  scarfDark: "#1d5aa6",
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

/** A limb as a thick outlined stroke: a dark line under a lighter one, so the outline follows the bend. */
function Limb({ d, width, fill }: { d: string; width: number; fill: string }) {
  return (
    <>
      <path d={d} fill="none" stroke={C.line} strokeWidth={width + 5} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={fill} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

/**
 * The hero, a fighter in the System jacket's colors with a scarf and a blade of light, facing right toward the monster.
 * Pure inline SVG, in layers (scarf, legs, torso, back arm, head, front arm, blade) so a weapon or an outfit can replace
 * one layer later. What she is doing (`state`) is moved by CSS. The chest is left open for the rank badge, which
 * `HeroFigure` lays on it.
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
      <ellipse cx={118} cy={250} rx={70} ry={7} fill="#000" opacity={0.4} />

      <g className="battle-hero-body" stroke={C.line} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round">
        {/* The scarf, streaming behind her */}
        <g className="battle-hero-scarf">
          <path d="M96 104 Q62 104 34 136 Q30 142 40 140 Q66 128 98 130 Z" fill={C.scarf} />
          <path d="M92 118 Q64 124 46 152 Q44 158 52 154 Q72 140 94 138 Z" fill={C.scarfDark} />
        </g>

        {/* Legs in a fighting stance: the back leg straight, the front leg bent forward */}
        <Limb d="M104 168 L90 208 L82 238" width={22} fill={C.armorMid} />
        <Limb d="M134 168 L152 204 L160 238" width={23} fill={C.armor} />
        <path d="M70 232 Q70 226 78 226 H96 L100 246 H68 Z" fill={C.boot} />
        <path d="M150 232 Q150 226 158 226 H176 Q184 230 182 246 H146 Z" fill={C.boot} />
        <path d="M70 242 H100 M148 242 H182" stroke={C.piping} strokeWidth={2} fill="none" opacity={0.8} />
        <path d="M93 192 L86 212 M144 190 L156 210" stroke={C.piping} strokeWidth={2} fill="none" opacity={0.6} />

        {/* The back arm, behind the body */}
        <Limb d="M96 116 L76 142 L90 164" width={17} fill={C.armorMid} />
        <circle cx={91} cy={167} r={9} fill={C.skin} />

        {/* Torso: a fitted jacket, wide at the shoulders and narrow at the belt, the chest left open for the badge */}
        <path d="M82 108 Q122 94 162 108 L154 172 H92 Z" fill={C.armor} />
        <path d="M92 110 Q122 100 152 110 L148 140 Q122 152 96 140 Z" fill={C.armorLight} stroke="none" />
        <path d="M92 160 H154 V174 H92 Z" fill={C.armorMid} />
        <rect x={114} y={160} width={18} height={14} rx={2.5} fill={C.armor} stroke={C.piping} strokeWidth={2} />
        <path d="M100 106 L122 144 L146 106" fill="none" stroke={C.piping} strokeWidth={2.4} />
        <path d="M86 114 Q84 144 94 170" fill="none" stroke={C.piping} strokeWidth={1.8} opacity={0.6} />
        {/* Shoulder plates */}
        <path d="M76 110 Q76 96 94 98 L98 118 Q82 124 76 110 Z" fill={C.armorLight} />
        <path d="M168 110 Q168 96 150 98 L146 118 Q162 124 168 110 Z" fill={C.armorLight} />

        {/* Head */}
        <rect x={112} y={90} width={22} height={16} rx={5} fill={C.skinShade} />
        <circle cx={122} cy={66} r={25} fill={C.skin} />
        <path d="M96 66 Q92 36 124 36 Q156 36 148 68 Q144 52 130 50 Q108 50 96 66 Z" fill={C.hair} />
        <path d="M96 66 L88 90 L102 82 Z" fill={C.hairDark} />
        <path d="M148 64 L160 50 L150 44 Z" fill={C.hair} />
        <path d="M98 64 H148" stroke={C.piping} strokeWidth={5.5} fill="none" />
        <path d="M98 64 H148" stroke="#ffffff" strokeWidth={1.4} fill="none" opacity={0.7} />
        <circle cx={136} cy={78} r={2.8} fill={C.line} stroke="none" />
        <path d="M130 88 Q137 91 143 87" fill="none" strokeWidth={2.2} />

        {/* The front arm and the blade, swung from the shoulder */}
        <g className="battle-hero-arm">
          <Limb d="M152 118 L172 140 L182 154" width={19} fill={C.armorLight} />
          <path d="M156 122 L172 140" fill="none" stroke={C.piping} strokeWidth={1.8} opacity={0.7} />
          <circle cx={184} cy={157} r={10} fill={C.skin} />
          <g className="battle-hero-blade">
            <path d="M184 166 L184 150 L236 40 L242 50 Z" fill={C.blade} opacity={0.35} stroke="none" />
            <path d="M184 158 L238 44" stroke={C.blade} strokeWidth={10} strokeLinecap="round" opacity={0.5} />
            <path d="M184 158 L238 44" stroke={C.bladeCore} strokeWidth={3.6} strokeLinecap="round" />
            <path d="M172 150 L198 164" stroke={C.line} strokeWidth={8} strokeLinecap="round" />
            <path d="M172 150 L198 164" stroke={C.piping} strokeWidth={3.4} strokeLinecap="round" />
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
      style={{ left: `${(122 / 240) * 100}%`, top: `${(134 / 260) * 100}%`, transform: "translate(-50%, -50%)" } as CSSProperties}
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
