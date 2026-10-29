import type { FrameStyle } from "@/lib/items";
import { cn } from "@/lib/utils";
import type { Rank, RankGlyph } from "@/lib/ranks";

/** The symbol in the middle of a badge, drawn in a 100 by 100 box with its center at 50, 52. */
function Glyph({ glyph, ink, bg }: { glyph: RankGlyph; ink: string; bg: string }) {
  const stroke = { stroke: ink, strokeWidth: 5, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" } as const;
  switch (glyph) {
    case "chevron":
      return (
        <g {...stroke}>
          <polyline points="35,56 50,41 65,56" />
          <polyline points="35,68 50,53 65,68" />
        </g>
      );
    case "plate":
      return (
        <g>
          <circle cx="50" cy="52" r="16" {...stroke} />
          <circle cx="50" cy="52" r="4.5" fill={ink} />
        </g>
      );
    case "plates":
      return (
        <g>
          <circle cx="41" cy="52" r="13" {...stroke} strokeWidth={4.5} />
          <circle cx="59" cy="52" r="13" {...stroke} strokeWidth={4.5} />
          <circle cx="41" cy="52" r="3.5" fill={ink} />
          <circle cx="59" cy="52" r="3.5" fill={ink} />
        </g>
      );
    case "dumbbell":
      return (
        <g fill={ink}>
          <rect x="28" y="42" width="7" height="20" rx="1.5" />
          <rect x="35" y="46" width="5" height="12" rx="1" />
          <rect x="60" y="46" width="5" height="12" rx="1" />
          <rect x="65" y="42" width="7" height="20" rx="1.5" />
          <rect x="40" y="50" width="20" height="4" rx="2" />
        </g>
      );
    case "barbell":
      return (
        <g fill={ink}>
          <rect x="20" y="50" width="60" height="4" rx="2" />
          <rect x="25" y="38" width="6" height="28" rx="1.5" />
          <rect x="32" y="43" width="5" height="18" rx="1" />
          <rect x="63" y="43" width="5" height="18" rx="1" />
          <rect x="69" y="38" width="6" height="28" rx="1.5" />
        </g>
      );
    case "flame":
      return (
        <path
          fill={ink}
          d="M50 33 C57 42 66 47 64 60 C62 69 56 72 50 72 C43 72 36 67 37 58 C38 52 43 50 44 43 C46 47 48 47 50 33 Z"
        />
      );
    case "kettlebell":
      return (
        <g>
          <circle cx="50" cy="60" r="15" fill={ink} />
          <path d="M39 50 C38 33 62 33 61 50" {...stroke} strokeWidth={5.5} />
        </g>
      );
    case "crown":
      return <path fill={ink} d="M33 66 L33 43 L43 54 L50 38 L57 54 L67 43 L67 66 Z" />;
    case "trophy":
      return (
        <g>
          <path fill={ink} d="M37 36 H63 V50 C63 59 57 63 50 63 C43 63 37 59 37 50 Z" />
          <path d="M37 40 H31 C31 50 35 53 39 53 M63 40 H69 C69 50 65 53 61 53" {...stroke} strokeWidth={3.5} />
          <rect x="46.5" y="63" width="7" height="7" fill={ink} />
          <rect x="39" y="70" width="22" height="5" rx="1.5" fill={ink} />
        </g>
      );
    case "bolt":
      return <path fill={ink} d="M56 32 L36 56 H48 L43 74 L64 48 H52 Z" />;
    case "skull":
      return (
        <g>
          <circle cx="50" cy="49" r="16" fill={ink} />
          <rect x="42" y="58" width="16" height="12" rx="3" fill={ink} />
          <circle cx="44" cy="49" r="4" fill={bg} />
          <circle cx="56" cy="49" r="4" fill={bg} />
          <rect x="49" y="55" width="2" height="4" fill={bg} />
        </g>
      );
    case "star":
      return (
        <polygon
          fill={ink}
          points="50,32 56,46 71,47.5 60,57.5 63,72 50,64.5 37,72 40,57.5 29,47.5 44,46"
        />
      );
    case "infinity":
      return (
        <path
          d="M32 52 C32 41 46 41 50 52 C54 63 68 63 68 52 C68 41 54 41 50 52 C46 63 32 63 32 52 Z"
          {...stroke}
          strokeWidth={5.5}
        />
      );
  }
}

function Frame({ rank, gradient }: { rank: Rank; gradient: string }) {
  const rim = { stroke: rank.colors.rim, strokeWidth: 3, fill: `url(#${gradient})` } as const;
  const shield = "M50 6 L88 18 V48 C88 72 71 88 50 96 C29 88 12 72 12 48 V18 Z";
  const wings = (
    <g fill={rank.colors.rim} opacity={0.9}>
      <path d="M12 26 L-14 16 L-8 34 L-18 38 L-6 52 L12 50 Z" />
      <path d="M88 26 L114 16 L108 34 L118 38 L106 52 L88 50 Z" />
    </g>
  );
  const crown = (
    <path
      d="M30 12 L34 -6 L42 4 L50 -12 L58 4 L66 -6 L70 12 Z"
      fill={rank.colors.rim}
      stroke={rank.colors.to}
      strokeWidth={1.5}
    />
  );
  switch (rank.frame) {
    case "ring":
      return <circle cx="50" cy="52" r="42" {...rim} />;
    case "shield":
      return <path d={shield} {...rim} />;
    case "winged":
      return (
        <>
          {wings}
          <path d={shield} {...rim} />
        </>
      );
    case "crowned":
      return (
        <>
          {wings}
          {crown}
          <path d={shield} {...rim} />
        </>
      );
  }
}

/** The points of a hexagon around the badge's center, point up. */
const hexagon = (radius: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const angle = ((-90 + i * 60) * Math.PI) / 180;
    return `${(50 + radius * Math.cos(angle)).toFixed(2)},${(52 + radius * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");

/**
 * A cosmetic frame from a quest chest, drawn behind the badge so wings and shields paint over it. It sits
 * in a margin around the badge, so the badge itself is never changed.
 */
function Decor({ style }: { style: FrameStyle }) {
  const center = { cx: 50, cy: 52 };
  switch (style) {
    case "steel":
      return (
        <g fill="none">
          <circle {...center} r={52} stroke="#b9c5d8" strokeWidth={3} />
          <circle {...center} r={47.5} stroke="#5f6f8c" strokeWidth={1.5} />
        </g>
      );
    case "cobalt":
      return (
        <g fill="none" style={{ filter: "drop-shadow(0 0 3px #4aa8ff)" }}>
          <circle {...center} r={52} stroke="#4aa8ff" strokeWidth={3} />
          <circle {...center} r={47} stroke="#9fd2ff" strokeWidth={1.5} strokeDasharray="3 3" />
        </g>
      );
    case "runic":
      return (
        <g fill="none" stroke="#b07cff" strokeLinecap="round">
          <circle {...center} r={50} strokeWidth={2.5} />
          {Array.from({ length: 16 }, (_, i) => {
            const angle = (i * 22.5 * Math.PI) / 180;
            const at = (r: number) => `${(50 + r * Math.cos(angle)).toFixed(2)} ${(52 + r * Math.sin(angle)).toFixed(2)}`;
            return <path key={i} d={`M${at(53)} L${at(58)}`} strokeWidth={i % 2 === 0 ? 2.5 : 1.5} />;
          })}
        </g>
      );
    case "hex":
      return (
        <g fill="none" strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 3px #b07cff)" }}>
          <polygon points={hexagon(57)} stroke="#b07cff" strokeWidth={3} />
          <polygon points={hexagon(52)} stroke="#6f4fb0" strokeWidth={1.5} />
        </g>
      );
    case "apex":
      return (
        <g fill="none" style={{ filter: "drop-shadow(0 0 4px #ffb83d)" }}>
          <circle {...center} r={52} stroke="#ffb83d" strokeWidth={3.5} />
          <circle {...center} r={57} stroke="#ffe08a" strokeWidth={1.5} strokeDasharray="6 10" className="chest-shimmer" />
          {[0, 90, 180, 270].map((deg) => (
            <rect key={deg} x={47} y={-7} width={6} height={6} fill="#ffe08a" transform={`rotate(${deg} 50 52) rotate(45 50 -4)`} />
          ))}
        </g>
      );
  }
}

/** The part of the 100 by 100 drawing each frame needs, so a plain shield is not shrunk to leave room for wings. */
const VIEW: Record<Rank["frame"], { x: number; y: number; w: number; h: number }> = {
  ring: { x: 2, y: 8, w: 96, h: 88 },
  shield: { x: 2, y: 2, w: 96, h: 100 },
  winged: { x: -24, y: 2, w: 148, h: 100 },
  crowned: { x: -24, y: -18, w: 148, h: 120 },
};

type RankBadgeProps = {
  rank: Rank;
  /** Height in pixels. The width follows from the frame. */
  size?: number;
  /** A rank not reached yet: muted but still in color, so you can see what you are working toward, with a small lock. */
  locked?: boolean;
  /** A cosmetic frame won from a quest chest, drawn around the badge. */
  decor?: FrameStyle | null;
  className?: string;
};

/**
 * The badge for a rank, pure inline SVG so it is sharp at any size and needs no image files. The
 * two highest ranks glow and pulse, unless the user asked their system for less motion.
 */
export function RankBadge({ rank, size = 64, locked = false, decor = null, className }: RankBadgeProps) {
  const gradient = `rank-${rank.id}`;
  const base = VIEW[rank.frame];
  // A decoration needs a margin around the badge.
  const pad = decor ? 10 : 0;
  const view = { x: base.x - pad, y: base.y - pad, w: base.w + pad * 2, h: base.h + pad * 2 };
  return (
    <svg
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      width={(size * view.w) / view.h}
      height={size}
      role="img"
      aria-label={locked ? `${rank.name}, not reached yet` : rank.name}
      className={cn("shrink-0", locked && "opacity-80 [filter:saturate(0.4)_brightness(0.8)]", className)}
    >
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={rank.colors.from} />
          <stop offset="1" stopColor={rank.colors.to} />
        </linearGradient>
      </defs>
      {decor && !locked && <Decor style={decor} />}
      {rank.animated && !locked && (
        <circle cx="50" cy="52" r="52" fill={rank.colors.glow} opacity={0.28} className="motion-safe:animate-pulse" />
      )}
      <Frame rank={rank} gradient={gradient} />
      <Glyph glyph={rank.glyph} ink={rank.colors.ink} bg={rank.colors.to} />
      {locked && (
        <g transform="translate(66 70)">
          <circle cx="12" cy="12" r="14" fill="#0a0b0d" stroke="#8b919a" strokeWidth={2} />
          <rect x="6" y="11" width="12" height="9" rx="2" fill="#8b919a" />
          <path d="M8.5 11 V8.5 A3.5 3.5 0 0 1 15.5 8.5 V11" fill="none" stroke="#8b919a" strokeWidth={2} />
        </g>
      )}
    </svg>
  );
}
