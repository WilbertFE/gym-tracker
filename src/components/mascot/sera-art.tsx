import { useId, type CSSProperties } from "react";
import type { Mood } from "@/lib/mascot/types";
import { cn } from "@/lib/utils";

/**
 * Sera, the guide. An original character drawn as inline SVG in the System palette: silver blue hair in a bob with
 * side swept bangs and one long lock, a slim headset with a glowing earpiece, and a dark high collar jacket with cyan
 * piping and a small rank pin. One drawing gives every mood by swapping the eyes, brows, mouth, blush and sparkle.
 * Everything that moves is CSS (`.sera-*` in globals.css) and is off for reduced motion.
 *
 * `bust` is head and shoulders, for the chat. `avatar` is the head only, for the corner button.
 */
const COLOR = {
  line: "#16233f",
  skin: "#f7e0d6",
  skinShade: "#e8bcae",
  blush: "#ff8fa6",
  hairLight: "#e8f1ff",
  hairBase: "#b6cdf3",
  hairMid: "#8aabe6",
  hairDark: "#5a7dc2",
  irisTop: "#a6d8ff",
  irisBottom: "#2c6bd6",
  pupil: "#0b1a33",
  jacket: "#0d1930",
  jacketLight: "#1a2c52",
  piping: "#4aa8ff",
  shirt: "#dbe6f7",
  headset: "#d3e3f8",
  headsetDark: "#8aa4c8",
  mouth: "#8a3347",
  tongue: "#e88a9a",
} as const;

type Face = {
  eyes: "open" | "happy" | "wide" | "sleepy" | "up";
  brows: "calm" | "raised" | "worried" | "thinking" | "cheer" | "sleepy";
  mouth: "smile" | "grin" | "o" | "flat" | "small";
  blush: number;
  sparkle: boolean;
  /** A small head tilt, in degrees. */
  tilt: number;
};

const FACES: Record<Mood, Face> = {
  calm: { eyes: "open", brows: "calm", mouth: "small", blush: 0.2, sparkle: false, tilt: 0 },
  happy: { eyes: "open", brows: "calm", mouth: "smile", blush: 0.5, sparkle: false, tilt: -1.5 },
  cheer: { eyes: "happy", brows: "cheer", mouth: "grin", blush: 0.7, sparkle: true, tilt: -2 },
  thinking: { eyes: "up", brows: "thinking", mouth: "flat", blush: 0.1, sparkle: false, tilt: 3 },
  surprised: { eyes: "wide", brows: "raised", mouth: "o", blush: 0.25, sparkle: false, tilt: 0 },
  sleepy: { eyes: "sleepy", brows: "sleepy", mouth: "small", blush: 0.35, sparkle: false, tilt: 4 },
};

/** The mouth shapes. `talk` is the open mouth that alternates with the resting one while she speaks. */
function Mouth({ shape, talking }: { shape: Face["mouth"]; talking: boolean }) {
  const stroke = { stroke: COLOR.line, strokeWidth: 2.4, fill: "none", strokeLinecap: "round" } as const;
  const resting = (() => {
    switch (shape) {
      case "smile":
        return <path d="M110 151 Q120 160 130 151" {...stroke} />;
      case "small":
        return <path d="M113 152 Q120 157 127 152" {...stroke} />;
      case "flat":
        return <path d="M114 154 Q120 153 126 154" {...stroke} />;
      case "o":
        return <ellipse cx={120} cy={155} rx={3.8} ry={4.6} fill={COLOR.mouth} stroke={COLOR.line} strokeWidth={1.8} />;
      case "grin":
        return (
          <g>
            <path d="M106 149 Q120 168 134 149 Z" fill={COLOR.mouth} stroke={COLOR.line} strokeWidth={2} strokeLinejoin="round" />
            <path d="M109 150 Q120 156 131 150 Q120 153 109 150 Z" fill="#fff" />
            <ellipse cx={120} cy={160} rx={4} ry={2.2} fill={COLOR.tongue} />
          </g>
        );
    }
  })();

  return (
    <g>
      <g className={talking ? "sera-mouth-rest" : undefined}>{resting}</g>
      {talking && (
        <g className="sera-mouth-talk" opacity={0}>
          <ellipse cx={120} cy={155} rx={6.2} ry={4.8} fill={COLOR.mouth} stroke={COLOR.line} strokeWidth={1.8} />
          <ellipse cx={120} cy={158} rx={3.2} ry={1.7} fill={COLOR.tongue} />
        </g>
      )}
    </g>
  );
}

const BROWS: Record<Face["brows"], { left: string; right: string }> = {
  calm: { left: "M86 103 Q100 96 114 101", right: "M126 101 Q140 96 154 103" },
  raised: { left: "M86 97 Q100 90 114 95", right: "M126 95 Q140 90 154 97" },
  worried: { left: "M86 104 Q100 103 114 95", right: "M126 95 Q140 103 154 104" },
  thinking: { left: "M86 103 Q100 97 114 102", right: "M126 93 Q140 86 154 95" },
  cheer: { left: "M86 99 Q100 91 114 98", right: "M126 98 Q140 91 154 99" },
  sleepy: { left: "M86 108 Q100 107 114 109", right: "M126 109 Q140 107 154 108" },
};

type EyeProps = { cx: number; kind: Face["eyes"]; clip: string; iris: string };

/** One eye. The right eye is the left one moved over, so both always match. */
function Eye({ cx, kind, clip, iris }: EyeProps) {
  const cy = 122;
  if (kind === "happy") {
    return <path d={`M${cx - 11} ${cy + 4} Q${cx} ${cy - 11} ${cx + 11} ${cy + 4}`} stroke={COLOR.line} strokeWidth={3.2} fill="none" strokeLinecap="round" />;
  }
  const wide = kind === "wide";
  const rx = wide ? 13 : 12;
  const ry = wide ? 15.5 : 14;
  const dx = kind === "up" ? 2.2 : 0;
  const dy = kind === "up" ? -3.4 : 0;
  const r = wide ? 10.4 : 9.2;

  return (
    <g>
      <clipPath id={clip}>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} />
      </clipPath>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#f6f9ff" />
      <g clipPath={`url(#${clip})`}>
        <circle cx={cx + dx} cy={cy + dy + 1} r={r} fill={`url(#${iris})`} />
        <circle cx={cx + dx} cy={cy + dy + 1} r={wide ? 4.2 : 4.8} fill={COLOR.pupil} />
        <circle cx={cx + dx + 3.6} cy={cy + dy - 3.8} r={wide ? 3.4 : 3.1} fill="#fff" />
        <circle cx={cx + dx - 3.2} cy={cy + dy + 4} r={1.5} fill="#fff" opacity={0.9} />
        {kind === "sleepy" && <rect x={cx - rx} y={cy - ry - 1} width={rx * 2} height={ry + 1} fill={COLOR.skin} />}
      </g>
      {kind === "sleepy" ? (
        <path d={`M${cx - 13} ${cy + 1} Q${cx} ${cy + 6} ${cx + 13} ${cy + 1}`} stroke={COLOR.line} strokeWidth={2.8} fill="none" strokeLinecap="round" />
      ) : (
        <path
          d={`M${cx - 13} ${cy - 2} Q${cx} ${cy - 18} ${cx + 13} ${cy - 2}`}
          stroke={COLOR.line}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
        />
      )}
      <path d={`M${cx - 10} ${cy + 11} Q${cx} ${cy + 15} ${cx + 10} ${cy + 11}`} stroke={COLOR.line} strokeWidth={1.2} fill="none" opacity={0.55} />
    </g>
  );
}

type SeraArtProps = {
  mood?: Mood;
  /** `bust` is head and shoulders, `avatar` the head only. */
  view?: "bust" | "avatar";
  /** Width in pixels. The height follows. */
  size?: number;
  /** The mouth moves while she speaks. */
  talking?: boolean;
  /** Draw a picture the owner supplies instead of the vector. */
  src?: string;
  className?: string;
};

const VIEWS = {
  bust: { box: "0 0 240 300", w: 240, h: 300 },
  avatar: { box: "44 20 152 170", w: 152, h: 170 },
} as const;

/** Sera. Decorative: the words she says are always real text beside her. */
export function SeraArt({ mood = "calm", view = "bust", size = 220, talking = false, src, className }: SeraArtProps) {
  const uid = useId().replace(/:/g, "");
  const id = (name: string) => `${uid}-${name}`;
  const face = FACES[mood];
  const v = VIEWS[view];
  const height = Math.round((size * v.h) / v.w);

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={height} className={cn("block", className)} />;
  }

  const brows = BROWS[face.brows];

  return (
    <svg
      viewBox={v.box}
      width={size}
      height={height}
      aria-hidden
      focusable="false"
      className={cn("sera block overflow-visible", talking && "sera-talking", className)}
      style={{ "--sera-glow": COLOR.piping } as CSSProperties}
    >
      <defs>
        <linearGradient id={id("hair")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={COLOR.hairLight} />
          <stop offset="0.35" stopColor={COLOR.hairBase} />
          <stop offset="1" stopColor={COLOR.hairMid} />
        </linearGradient>
        <linearGradient id={id("hairBack")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={COLOR.hairMid} />
          <stop offset="1" stopColor={COLOR.hairDark} />
        </linearGradient>
        <linearGradient id={id("iris")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={COLOR.irisTop} />
          <stop offset="1" stopColor={COLOR.irisBottom} />
        </linearGradient>
        <linearGradient id={id("jacket")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={COLOR.jacketLight} />
          <stop offset="1" stopColor={COLOR.jacket} />
        </linearGradient>
        <radialGradient id={id("glow")}>
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.35" stopColor={COLOR.piping} />
          <stop offset="1" stopColor={COLOR.piping} stopOpacity={0} />
        </radialGradient>
        <clipPath id={id("face")}>
          <path d="M72 112 C72 80 92 62 120 62 C148 62 168 80 168 112 C168 140 150 170 120 174 C90 170 72 140 72 112 Z" />
        </clipPath>
      </defs>

      <g className="sera-breathe">
        {/* Back hair: the bob behind the head and the shoulders. */}
        <path
          d="M120 26 C70 26 46 70 48 118 C49 150 52 176 62 196 C74 188 84 172 86 152 L154 152 C156 172 166 188 178 196 C188 176 191 150 192 118 C194 70 170 26 120 26 Z"
          fill={`url(#${id("hairBack")})`}
          stroke={COLOR.line}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {view === "bust" && (
          <g transform="translate(0 -10)">
            {/* Jacket: dark, with a high collar, a light shirt and cyan piping. */}
            <path d="M14 316 C20 244 58 212 100 200 L140 200 C182 212 220 244 226 316 Z" fill={`url(#${id("jacket")})`} stroke={COLOR.line} strokeWidth={2} strokeLinejoin="round" />
            <path d="M104 160 L104 198 C104 208 136 208 136 198 L136 160 Z" fill={COLOR.skinShade} stroke={COLOR.line} strokeWidth={2} strokeLinejoin="round" />
            <path d="M102 198 L120 238 L138 198 Z" fill={COLOR.shirt} stroke={COLOR.line} strokeWidth={1.8} strokeLinejoin="round" />
            <path d="M82 208 L102 197 L120 238 L92 246 Z" fill={COLOR.jacketLight} stroke={COLOR.line} strokeWidth={2} strokeLinejoin="round" />
            <path d="M158 208 L138 197 L120 238 L148 246 Z" fill={COLOR.jacketLight} stroke={COLOR.line} strokeWidth={2} strokeLinejoin="round" />
            <path d="M84 211 L103 200 L120 236" stroke={COLOR.piping} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M156 211 L137 200 L120 236" stroke={COLOR.piping} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M44 268 C58 250 82 240 98 248" stroke={COLOR.piping} strokeWidth={1.6} fill="none" opacity={0.6} strokeLinecap="round" />
            <path d="M196 268 C182 250 158 240 142 248" stroke={COLOR.piping} strokeWidth={1.6} fill="none" opacity={0.6} strokeLinecap="round" />
            {/* The rank pin. */}
            <g transform="translate(170 262)">
              <path d="M0 -11 L9 -7 V3 C9 9 4 12 0 14 C-4 12 -9 9 -9 3 V-7 Z" fill={COLOR.jacket} stroke={COLOR.piping} strokeWidth={1.8} strokeLinejoin="round" />
              <path d="M-4 0 L0 -5 L4 0" stroke={COLOR.piping} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </g>
        )}

        {/* The head, tilted a little with the mood. */}
        <g transform={`rotate(${face.tilt} 120 150)`}>
          {/* Left ear and the headset cup. */}
          <ellipse cx={71} cy={122} rx={7} ry={10.5} fill={COLOR.skin} stroke={COLOR.line} strokeWidth={2} />

          {/* Face. */}
          <path
            d="M72 112 C72 80 92 62 120 62 C148 62 168 80 168 112 C168 140 150 170 120 174 C90 170 72 140 72 112 Z"
            fill={COLOR.skin}
            stroke={COLOR.line}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <g clipPath={`url(#${id("face")})`}>
            <ellipse cx={120} cy={102} rx={50} ry={11} fill={COLOR.skinShade} opacity={0.45} />
            <path d="M152 112 C170 130 160 164 124 176 C146 160 154 136 152 112 Z" fill={COLOR.skinShade} opacity={0.4} />
          </g>

          {/* Blush, nose, brows. */}
          <ellipse cx={87} cy={141} rx={9} ry={5} fill={COLOR.blush} opacity={face.blush} />
          <ellipse cx={153} cy={141} rx={9} ry={5} fill={COLOR.blush} opacity={face.blush} />
          <path d="M119 139 Q121 142.5 123.5 140" stroke={COLOR.skinShade} strokeWidth={2} fill="none" strokeLinecap="round" />
          <path d={brows.left} stroke={COLOR.hairDark} strokeWidth={3} fill="none" strokeLinecap="round" />
          <path d={brows.right} stroke={COLOR.hairDark} strokeWidth={3} fill="none" strokeLinecap="round" />

          {/* Eyes and mouth. */}
          <g className="sera-eyes">
            <Eye cx={100} kind={face.eyes} clip={id("eyeL")} iris={id("iris")} />
            <Eye cx={140} kind={face.eyes} clip={id("eyeR")} iris={id("iris")} />
          </g>
          <Mouth shape={face.mouth} talking={talking} />

          {/* Headset: the cup on her ear with its glowing light, and the boom to the mouth. */}
          <path d="M60 134 C 62 152 74 162 92 159" stroke={COLOR.headsetDark} strokeWidth={3} fill="none" strokeLinecap="round" />
          <circle cx={93} cy={159} r={3.4} fill={COLOR.piping} className="sera-glow" />
          <circle cx={62} cy={120} r={13} fill={COLOR.headset} stroke={COLOR.line} strokeWidth={2} />
          <circle cx={62} cy={120} r={7.5} fill={COLOR.headsetDark} stroke={COLOR.line} strokeWidth={1.4} />
          <circle cx={62} cy={120} r={14} fill={`url(#${id("glow")})`} className="sera-glow" opacity={0.7} />
          <circle cx={62} cy={120} r={3.6} fill={COLOR.piping} />

          {/* Front hair: the bangs and the one long lock. */}
          <path
            d="M70 114 C 60 80 78 44 120 40 C 162 44 180 80 170 114 C 166 102 160 92 152 88 C 150 95 142 100 134 98 C 130 91 124 88 118 86 C 116 94 108 100 98 98 C 94 93 88 90 82 92 C 78 98 74 106 70 114 Z"
            fill={`url(#${id("hair")})`}
            stroke={COLOR.line}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <path d="M92 60 C 104 49 124 47 142 54" stroke={COLOR.hairLight} strokeWidth={2.4} fill="none" strokeLinecap="round" opacity={0.85} />
          <path d="M118 90 C 123 76 124 62 121 48" stroke={COLOR.hairDark} strokeWidth={1.6} fill="none" opacity={0.55} strokeLinecap="round" />
          <path d="M96 100 C 90 86 88 72 92 60" stroke={COLOR.hairDark} strokeWidth={1.6} fill="none" opacity={0.5} strokeLinecap="round" />
          <path d="M148 94 C 156 82 160 70 158 58" stroke={COLOR.hairDark} strokeWidth={1.6} fill="none" opacity={0.5} strokeLinecap="round" />
          {/* A small hair clip, the colour of the System. */}
          <g transform="translate(150 70) rotate(30)">
            <rect x={-8} y={-2.4} width={16} height={4.8} rx={2.4} fill={COLOR.jacket} stroke={COLOR.line} strokeWidth={1.4} />
            <circle cx={0} cy={0} r={2} fill={COLOR.piping} className="sera-glow" />
          </g>

          {/* The headband runs over the top of her head and tucks under the long lock. */}
          <path d="M62 108 C 56 58 92 30 122 30 C 152 30 178 58 176 106" stroke={COLOR.line} strokeWidth={7} fill="none" strokeLinecap="round" />
          <path d="M62 108 C 56 58 92 30 122 30 C 152 30 178 58 176 106" stroke={COLOR.headset} strokeWidth={4} fill="none" strokeLinecap="round" />

          <g className="sera-sway">
            <path
              d="M166 98 C 180 122 188 152 184 184 C 182 212 176 234 164 256 C 158 232 156 204 158 180 C 160 152 162 124 166 98 Z"
              fill={`url(#${id("hair")})`}
              stroke={COLOR.line}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            <path d="M174 126 C 180 152 180 184 171 222" stroke={COLOR.hairLight} strokeWidth={2} fill="none" opacity={0.8} strokeLinecap="round" />
          </g>
        </g>

        {face.sparkle && (
          <path
            className="sera-sparkle"
            d="M204 54 L208 66 L220 70 L208 74 L204 86 L200 74 L188 70 L200 66 Z"
            fill={COLOR.hairLight}
            stroke={COLOR.piping}
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
        )}
      </g>
    </svg>
  );
}
