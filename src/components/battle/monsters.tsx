import { useId } from "react";
import { MonsterFrame, Wounds, type MonsterArtProps } from "./monster-shared";

/**
 * The five monsters after the Iron Golem, one per gate rank, each drawn as inline SVG in the System palette and facing
 * left toward the hero. They share a frame and a `battle-monster-body` group (see `monster-shared.tsx`), so the same CSS
 * moves them: they breathe, flash when hit, lunge when they strike and tip over when they fall.
 */

const LINE = "#0f1830";

/** Rep Wraith (rank D): a hooded shade with cold violet eyes and reaching, tattered sleeves. */
export function WraithArt({ state = "idle", hp = 1, size, className }: MonsterArtProps) {
  const uid = useId().replace(/:/g, "");
  const down = state === "down";
  return (
    <MonsterFrame state={state} size={size} className={className}>
      <defs>
        <linearGradient id={`${uid}-cloak`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5b4d86" />
          <stop offset="1" stopColor="#2a2148" stopOpacity={0.85} />
        </linearGradient>
        <radialGradient id={`${uid}-eye`}>
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.4" stopColor="#c9a2ff" />
          <stop offset="1" stopColor="#8a5cf0" stopOpacity={0} />
        </radialGradient>
      </defs>
      <g className="battle-monster-body" stroke={LINE} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round">
        {/* The cloak, ending in rags where legs would be */}
        <path
          d="M120 30 C78 30 62 78 60 128 C58 176 50 212 36 238 L62 226 L82 248 L102 228 L120 250 L140 228 L160 248 L180 226 L206 238 C190 212 182 176 180 128 C178 78 162 30 120 30 Z"
          fill={`url(#${uid}-cloak)`}
          opacity={down ? 0.5 : 1}
        />
        <path d="M84 130 C86 168 80 200 70 226 M156 130 C154 168 160 200 170 226 M120 150 V236" fill="none" stroke="#1b1434" strokeWidth={2.4} opacity={0.7} />
        {/* The hood: a dark hollow with two cold eyes */}
        <ellipse cx={120} cy={82} rx={36} ry={42} fill="#090716" />
        <g className={down ? undefined : "battle-eyes"}>
          <circle cx={104} cy={82} r={16} fill={`url(#${uid}-eye)`} stroke="none" opacity={down ? 0.15 : 1} />
          <circle cx={138} cy={82} r={16} fill={`url(#${uid}-eye)`} stroke="none" opacity={down ? 0.15 : 1} />
          <ellipse cx={104} cy={82} rx={5} ry={7} fill={down ? "#3a3060" : "#fff"} stroke="none" />
          <ellipse cx={138} cy={82} rx={5} ry={7} fill={down ? "#3a3060" : "#fff"} stroke="none" />
        </g>
        {/* Tattered sleeves reaching toward the hero, with bony hands */}
        <g className="battle-monster-fist">
          <path d="M80 118 C56 124 38 138 26 160 L42 158 L36 174 L54 164 L56 178 L66 156 C74 140 82 132 90 128 Z" fill="#3d3266" />
          <path d="M26 160 L16 176 M34 164 L28 184 M44 160 L42 182" fill="none" stroke="#d9d2f0" strokeWidth={4} />
        </g>
        <path d="M160 118 C178 124 192 136 200 154 L186 152 L192 168 L176 158 L170 142 Z" fill="#3d3266" />
      </g>
      <Wounds hp={hp} down={down} color="#c9a2ff" marks={["M96 40 L108 62", "M150 112 L162 150 L152 176", "M74 156 L88 190 L80 214"]} />
    </MonsterFrame>
  );
}

/** Plate Titan (rank C): a giant in stacked iron plates, a horned helm and a hammer. */
export function TitanArt({ state = "idle", hp = 1, size, className }: MonsterArtProps) {
  const uid = useId().replace(/:/g, "");
  const down = state === "down";
  return (
    <MonsterFrame state={state} size={size} className={className}>
      <defs>
        <linearGradient id={`${uid}-iron`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7a6a58" />
          <stop offset="1" stopColor="#4a3e32" />
        </linearGradient>
      </defs>
      <g className="battle-monster-body" stroke={LINE} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round">
        {/* Legs and boots of stacked plates */}
        <rect x={74} y={190} width={42} height={58} rx={6} fill="#3a3026" />
        <rect x={126} y={190} width={42} height={58} rx={6} fill="#3a3026" />
        <path d="M70 232 H118 V250 H66 Z M124 232 H172 L176 250 H122 Z" fill="#2a2219" />
        {/* The torso: three bands of plate */}
        <path d="M66 96 H174 L184 204 H56 Z" fill={`url(#${uid}-iron)`} />
        <path d="M60 130 H180 M58 164 H182" stroke="#2a2219" strokeWidth={3} fill="none" />
        {[[78, 112], [162, 112], [74, 148], [166, 148], [70, 184], [170, 184]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={3.4} fill="#2a2219" strokeWidth={1.6} />
        ))}
        <circle cx={120} cy={150} r={14} fill="#2a2219" />
        <circle cx={120} cy={150} r={7} fill={down ? "#4a3e32" : "#ff6b3d"} strokeWidth={2} />
        {/* Round pauldrons */}
        <ellipse cx={58} cy={104} rx={30} ry={24} fill="#8a7a66" />
        <ellipse cx={182} cy={104} rx={30} ry={24} fill="#8a7a66" />
        <path d="M34 104 H82 M158 104 H206" stroke="#4a3e32" strokeWidth={2.4} fill="none" />
        {/* The near arm raises a hammer */}
        <g className="battle-monster-fist">
          <rect x={22} y={110} width={26} height={72} rx={8} transform="rotate(14 35 146)" fill="#7a6a58" />
          <rect x={6} y={44} width={12} height={150} rx={4} transform="rotate(14 12 120)" fill="#4a3320" />
          <rect x={-18} y={26} width={64} height={40} rx={7} transform="rotate(14 14 46)" fill="#5a5f6b" />
          <path d="M-8 38 H36" stroke="#2c303a" strokeWidth={2.4} fill="none" transform="rotate(14 14 46)" />
          <circle cx={30} cy={196} r={13} fill="#6a5a48" />
        </g>
        <rect x={190} y={116} width={26} height={70} rx={8} fill="#7a6a58" />
        <circle cx={203} cy={192} r={13} fill="#6a5a48" />
        {/* The helm with horns and a red slit */}
        <rect x={92} y={42} width={56} height={58} rx={9} fill="#6a5a48" />
        <path d="M92 52 L74 22 L98 44 Z M148 52 L166 22 L142 44 Z" fill="#c8c0ae" />
        <path d="M100 68 H140" stroke={down ? "#4a3e32" : "#ff4d3d"} strokeWidth={7} strokeLinecap="round" className={down ? undefined : "battle-eyes"} />
        <path d="M104 90 H136 M108 82 H132" stroke="#3a3026" strokeWidth={2.2} fill="none" />
      </g>
      <Wounds hp={hp} down={down} marks={["M100 100 L110 128 L100 150", "M160 120 L150 150 L164 176", "M120 44 L116 62 L126 70"]} />
    </MonsterFrame>
  );
}

/** Barbell Hydra (rank B): a low scaled body with three long necks and snapping heads. */
export function HydraArt({ state = "idle", hp = 1, size, className }: MonsterArtProps) {
  const uid = useId().replace(/:/g, "");
  const down = state === "down";
  const head = (x: number, y: number, tilt: number) => (
    <g transform={`rotate(${tilt} ${x} ${y})`}>
      <path d={`M${x - 30} ${y + 6} Q${x - 28} ${y - 18} ${x} ${y - 18} Q${x + 28} ${y - 16} ${x + 30} ${y + 4} L${x + 20} ${y + 16} L${x - 24} ${y + 16} Z`} fill="#2f8a6d" />
      <path d={`M${x - 30} ${y + 6} L${x - 44} ${y + 12} L${x - 24} ${y + 16} Z`} fill="#3aa684" />
      <path d={`M${x - 36} ${y + 10} l4 8 l5 -7 M${x - 26} ${y + 14} l4 8 l5 -7`} stroke="#f2f2e4" strokeWidth={2.2} fill="none" />
      <circle cx={x - 6} cy={y - 4} r={5} fill={down ? "#35514a" : "#ffe14a"} strokeWidth={2} />
      <path d={`M${x + 8} ${y - 18} L${x + 14} ${y - 32} L${x + 20} ${y - 16}`} fill="#1f6a52" />
    </g>
  );
  return (
    <MonsterFrame state={state} size={size} className={className}>
      <defs>
        <linearGradient id={`${uid}-scale`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3aa684" />
          <stop offset="1" stopColor="#1d5f4a" />
        </linearGradient>
      </defs>
      <g className="battle-monster-body" stroke={LINE} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round">
        {/* The tail, curling away to the right */}
        <path d="M170 214 C204 214 226 196 224 168 C222 190 206 202 176 198 Z" fill="#1d5f4a" />
        {/* The three necks, thick strokes with an outline that follows the bend */}
        {[
          "M112 200 C96 164 84 126 80 96",
          "M124 196 C120 150 118 110 122 72",
          "M138 200 C154 164 164 128 170 100",
        ].map((d) => (
          <g key={d} fill="none">
            <path d={d} stroke={LINE} strokeWidth={27} />
            <path d={d} stroke="#2f8a6d" strokeWidth={21} />
            <path d={d} stroke="#58c9a4" strokeWidth={5} opacity={0.5} />
          </g>
        ))}
        {head(70, 90, -12)}
        {head(116, 62, 2)}
        {head(168, 96, 10)}
        {/* The body */}
        <ellipse cx={124} cy={214} rx={82} ry={36} fill={`url(#${uid}-scale)`} />
        <path d="M70 206 Q90 196 108 206 M104 220 Q124 210 144 220 M140 206 Q158 196 178 206" stroke="#164a3a" strokeWidth={2.4} fill="none" />
      </g>
      <Wounds hp={hp} down={down} marks={["M98 204 L112 222", "M150 200 L160 224", "M122 180 L130 200"]} />
    </MonsterFrame>
  );
}

/** Lactic Drake (rank A): a red drake with spread wings, horns and ember eyes. */
export function DrakeArt({ state = "idle", hp = 1, size, className }: MonsterArtProps) {
  const uid = useId().replace(/:/g, "");
  const down = state === "down";
  return (
    <MonsterFrame state={state} size={size} className={className}>
      <defs>
        <linearGradient id={`${uid}-hide`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b8392f" />
          <stop offset="1" stopColor="#6e1f1f" />
        </linearGradient>
        <linearGradient id={`${uid}-wing`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8a2b2b" />
          <stop offset="1" stopColor="#3d1216" />
        </linearGradient>
      </defs>
      <g className="battle-monster-body" stroke={LINE} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round">
        {/* Wings behind the body */}
        <path d="M150 140 L176 30 L192 72 L210 24 L222 84 L238 62 L214 150 Z" fill={`url(#${uid}-wing)`} />
        <path d="M150 140 L176 30 M170 130 L192 72 M184 138 L210 24 M200 142 L222 84" stroke="#e8c9a0" strokeWidth={3} fill="none" opacity={0.8} />
        {/* The tail */}
        <path d="M188 200 C220 204 236 186 232 160 C226 182 214 192 184 188 Z" fill="#6e1f1f" />
        <path d="M232 160 L244 150 L238 170 Z" fill="#e8c9a0" />
        {/* Legs */}
        <path d="M100 206 L96 248 H128 L124 206 Z M148 206 L150 248 H182 L174 206 Z" fill="#7a2323" />
        <path d="M92 248 l-8 6 M100 248 l-4 8 M112 248 l-2 8 M148 248 l-4 8 M160 248 l0 8 M172 248 l4 8" stroke="#e8c9a0" strokeWidth={3} fill="none" />
        {/* The body and belly */}
        <ellipse cx={142} cy={176} rx={68} ry={46} fill={`url(#${uid}-hide)`} />
        <path d="M96 186 Q142 222 188 184 Q142 206 96 186 Z" fill="#e8c9a0" opacity={0.85} stroke="none" />
        {/* The neck and head, low toward the hero */}
        <path d="M96 164 C76 148 66 120 70 92 L98 86 C98 112 108 132 122 148 Z" fill="#a23329" />
        <path d="M60 86 Q58 64 84 62 Q112 62 116 86 L104 108 L66 108 Z" fill="#b8392f" />
        <path d="M58 92 L36 102 L64 108 Z" fill="#a23329" />
        <path d="M42 100 l5 8 l5 -7 M52 104 l4 8 l5 -7" stroke="#f4eee0" strokeWidth={2.2} fill="none" />
        <path d="M84 64 L78 36 L98 60 Z M104 66 L112 40 L116 70 Z" fill="#e8c9a0" />
        <circle cx={86} cy={84} r={6.5} fill={down ? "#5a2b2b" : "#ffb347"} strokeWidth={2.2} className={down ? undefined : "battle-eyes"} />
        <g className="battle-monster-fist">
          <path d="M104 190 L70 214 L62 232 L88 222 L110 206 Z" fill="#a23329" />
          <path d="M62 232 l-8 4 M70 230 l-4 8 M80 226 l-2 8" stroke="#f4eee0" strokeWidth={3} fill="none" />
        </g>
      </g>
      <Wounds hp={hp} down={down} marks={["M120 160 L134 184 L124 204", "M160 150 L170 178", "M82 70 L92 96"]} />
    </MonsterFrame>
  );
}

/** Deadlift Colossus (rank S): a black stone giant with gold runes, carrying a barbell across its shoulders. */
export function ColossusArt({ state = "idle", hp = 1, size, className }: MonsterArtProps) {
  const uid = useId().replace(/:/g, "");
  const down = state === "down";
  const gold = down ? "#6a5a30" : "#ffd25c";
  return (
    <MonsterFrame state={state} size={size} className={className}>
      <defs>
        <linearGradient id={`${uid}-stone`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a2f3d" />
          <stop offset="1" stopColor="#12151f" />
        </linearGradient>
      </defs>
      <g className="battle-monster-body" stroke="#05070d" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round">
        {/* Legs */}
        <rect x={72} y={186} width={46} height={62} rx={7} fill="#171a26" />
        <rect x={124} y={186} width={46} height={62} rx={7} fill="#171a26" />
        <path d="M66 236 H120 V250 H62 Z M122 236 H176 L180 250 H118 Z" fill="#0c0e16" />
        {/* The torso: very broad, with gold runes */}
        <path d="M42 100 H198 L186 204 H54 Z" fill={`url(#${uid}-stone)`} />
        <path d="M120 112 V196 M96 132 H144 M88 160 H152 M104 116 L120 134 L136 116" stroke={gold} strokeWidth={3.4} fill="none" className={down ? undefined : "battle-core"} />
        <circle cx={120} cy={146} r={9} fill={gold} stroke="#05070d" strokeWidth={2.4} />
        {/* The head: a small helm with one gold slit */}
        <rect x={98} y={50} width={44} height={52} rx={8} fill="#1d212e" />
        <path d="M104 74 H136" stroke={gold} strokeWidth={7} strokeLinecap="round" className={down ? undefined : "battle-eyes"} />
        <path d="M108 92 H132" stroke="#0c0e16" strokeWidth={2.4} fill="none" />
        {/* Arms up, gripping the bar */}
        <g className="battle-monster-fist">
          <path d="M44 108 L26 80 L40 64" fill="none" stroke="#05070d" strokeWidth={30} />
          <path d="M44 108 L26 80 L40 64" fill="none" stroke="#232838" strokeWidth={24} />
          <circle cx={42} cy={64} r={13} fill="#2c3346" />
        </g>
        <path d="M196 108 L214 80 L200 64" fill="none" stroke="#05070d" strokeWidth={30} />
        <path d="M196 108 L214 80 L200 64" fill="none" stroke="#232838" strokeWidth={24} />
        <circle cx={198} cy={64} r={13} fill="#2c3346" />
        {/* The barbell: a long bar, with a stack of plates at each end */}
        <rect x={-8} y={58} width={256} height={12} rx={4} fill="#aab2c4" />
        <rect x={-10} y={26} width={14} height={76} rx={4} fill="#3a4258" />
        <rect x={6} y={34} width={12} height={60} rx={4} fill="#2c3346" />
        <rect x={236} y={26} width={14} height={76} rx={4} fill="#3a4258" />
        <rect x={222} y={34} width={12} height={60} rx={4} fill="#2c3346" />
      </g>
      <Wounds hp={hp} down={down} color="#ffd25c" marks={["M70 120 L84 148 L72 172", "M170 124 L158 152 L172 180", "M120 52 L116 70"]} />
    </MonsterFrame>
  );
}
