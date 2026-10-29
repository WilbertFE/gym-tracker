import { C } from "./palette";

type Ids = (name: string) => string;

const outline = { stroke: C.line, strokeWidth: 2, strokeLinejoin: "round" } as const;

/** The volume behind her head and shoulders. */
export function BackHair({ id }: { id: Ids }) {
  return (
    <path
      d="M120 20 C66 20 36 62 38 120 C40 162 44 204 58 232 C84 220 98 200 100 172 L140 172 C142 200 156 220 182 232 C196 204 200 162 202 120 C204 62 174 20 120 20 Z"
      fill={`url(#${id("hairBack")})`}
      {...outline}
    />
  );
}

/** One long twin tail, drawn for the left side. The right one is this mirrored. */
function Tail({ id, className }: { id: Ids; className: string }) {
  return (
    <g className={className}>
      <path
        d="M58 94 C30 100 10 140 14 196 C17 240 8 286 22 344 C36 324 52 294 52 252 C52 220 62 196 70 160 C74 138 70 112 58 94 Z"
        fill={`url(#${id("tail")})`}
        {...outline}
      />
      <path d="M32 128 C24 176 30 240 27 304" stroke={C.hairLight} strokeWidth={2.4} fill="none" strokeLinecap="round" opacity={0.75} />
      <path d="M50 150 C48 200 52 230 40 300" stroke={C.hairShade} strokeWidth={1.6} fill="none" strokeLinecap="round" opacity={0.5} />
      <path d="M22 200 C20 250 26 296 24 330" stroke={C.hairShade} strokeWidth={1.4} fill="none" strokeLinecap="round" opacity={0.4} />
    </g>
  );
}

/** The twin tails, behind the body. */
export function Tails({ id }: { id: Ids }) {
  return (
    <g>
      <Tail id={id} className="sera-tail" />
      <g transform="translate(240 0) scale(-1 1)">
        <Tail id={id} className="sera-tail sera-tail-alt" />
      </g>
    </g>
  );
}

/** A small hair ribbon where a tail is tied, drawn for the left side. */
function HairBow() {
  return (
    <g className="sera-ribbon">
      <path d="M58 100 C44 82 28 90 32 106 C35 118 50 112 58 104 Z" fill={C.ribbon} {...outline} strokeWidth={1.8} />
      <path d="M58 100 C70 80 88 88 82 104 C78 116 64 112 58 104 Z" fill={C.ribbon} {...outline} strokeWidth={1.8} />
      <path d="M44 94 C40 98 38 102 40 108" stroke={C.ribbonLight} strokeWidth={2} fill="none" strokeLinecap="round" />
      <path d="M72 92 C76 96 78 100 76 106" stroke={C.ribbonLight} strokeWidth={2} fill="none" strokeLinecap="round" />
      <ellipse cx={58} cy={102} rx={6} ry={7} fill={C.ribbonDark} {...outline} strokeWidth={1.8} />
    </g>
  );
}

/** One side lock framing the face, for the left. The right one is this mirrored. */
function SideLock({ id }: { id: Ids }) {
  return (
    <g>
      <path
        d="M66 98 C56 126 56 170 64 210 C72 194 78 164 77 136 C77 120 73 108 66 98 Z"
        fill={`url(#${id("hair")})`}
        {...outline}
      />
      <path d="M66 112 C60 142 62 176 64 200" stroke={C.hairShade} strokeWidth={1.6} fill="none" opacity={0.55} strokeLinecap="round" />
      <path d="M74 110 C72 130 74 150 72 170" stroke={C.hairLight} strokeWidth={1.8} fill="none" opacity={0.7} strokeLinecap="round" />
    </g>
  );
}

/** The bangs, the side locks, the ahoge, the hair ribbons and a small star clip: everything that sits over the face. */
export function FrontHair({ id }: { id: Ids }) {
  return (
    <g>
      <SideLock id={id} />
      <g transform="translate(240 0) scale(-1 1)">
        <SideLock id={id} />
      </g>

      {/* The bangs, parted in the middle, in separate locks. */}
      <path
        d="M64 112 C54 70 76 32 120 30 C164 32 186 70 176 112 C174 106 172 98 168 90 C162 96 156 94 152 88 C146 95 140 94 136 90 C133 104 130 114 126 124 C124 114 122 104 120 96 C118 104 116 114 114 124 C110 114 107 104 104 90 C100 94 94 95 88 88 C84 94 78 96 72 90 C68 98 66 106 64 112 Z"
        fill={`url(#${id("hair")})`}
        {...outline}
      />
      {/* Strands inside the bangs, the soft curved highlight across the crown, and its rim light. */}
      <g fill="none" strokeLinecap="round">
        <path d="M120 34 C126 62 130 92 126 122" stroke={C.hairShade} strokeWidth={1.6} opacity={0.5} />
        <path d="M120 34 C114 62 110 92 114 122" stroke={C.hairShade} strokeWidth={1.6} opacity={0.5} />
        <path d="M96 40 C84 56 80 78 88 92" stroke={C.hairShade} strokeWidth={1.5} opacity={0.45} />
        <path d="M144 40 C156 56 160 78 152 92" stroke={C.hairShade} strokeWidth={1.5} opacity={0.45} />
        <path d="M82 62 C96 46 144 46 158 62" stroke={C.hairLight} strokeWidth={8} opacity={0.75} />
        <path d="M88 70 C100 58 140 58 152 70" stroke="#fff" strokeWidth={2} opacity={0.8} />
      </g>

      {/* The ahoge: one strand that will not lie down. */}
      <g className="sera-ahoge">
        <path d="M118 36 C104 14 122 2 134 14 C126 12 122 22 124 36 Z" fill={`url(#${id("hair")})`} {...outline} strokeWidth={1.8} />
      </g>

      <HairBow />
      <g transform="translate(240 0) scale(-1 1)">
        <HairBow />
      </g>

      {/* A small star clip, with the System's glow. */}
      <g transform="translate(152 60) rotate(14)">
        <circle r={9} fill={C.piping} opacity={0.25} className="sera-glow" />
        <path d="M0 -7 L2 -2.2 L7 -2 L3 1.4 L4.4 6.6 L0 3.6 L-4.4 6.6 L-3 1.4 L-7 -2 L-2 -2.2 Z" fill={C.gold} stroke={C.line} strokeWidth={1.4} strokeLinejoin="round" />
      </g>
    </g>
  );
}
