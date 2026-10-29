import { C } from "./palette";

export type Face = {
  eyes: "open" | "happy" | "wide" | "sleepy" | "up" | "star";
  brows: "calm" | "raised" | "worried" | "thinking" | "cheer" | "sleepy";
  mouth: "smile" | "grin" | "o" | "flat" | "small";
  blush: number;
  sparkle: boolean;
  /** A small head tilt, in degrees. */
  tilt: number;
};

/** The six moods. Mood is the face; the pose is what her arms do. */
export const FACES: Record<"calm" | "happy" | "cheer" | "thinking" | "surprised" | "sleepy", Face> = {
  calm: { eyes: "open", brows: "calm", mouth: "small", blush: 0.45, sparkle: false, tilt: 0 },
  happy: { eyes: "open", brows: "calm", mouth: "smile", blush: 0.75, sparkle: false, tilt: -2 },
  cheer: { eyes: "star", brows: "cheer", mouth: "grin", blush: 0.9, sparkle: true, tilt: -3 },
  thinking: { eyes: "up", brows: "thinking", mouth: "flat", blush: 0.3, sparkle: false, tilt: 4 },
  surprised: { eyes: "wide", brows: "raised", mouth: "o", blush: 0.4, sparkle: false, tilt: 0 },
  sleepy: { eyes: "sleepy", brows: "sleepy", mouth: "small", blush: 0.6, sparkle: false, tilt: 5 },
};

/** The face outline, used to draw the head and to clip its shading. */
export const FACE_PATH =
  "M64 108 C64 70 88 50 120 50 C152 50 176 70 176 108 C176 138 160 170 138 182 C130 187 124 190 120 190 C116 190 110 187 102 182 C80 170 64 138 64 108 Z";

const EYE_Y = 134;

type EyeProps = { cx: number; side: -1 | 1; kind: Face["eyes"]; clip: string; iris: string };

/** One big anime eye. The right eye is the left one mirrored, so the pair always matches. */
function Eye({ cx, side, kind, clip, iris }: EyeProps) {
  const cy = EYE_Y;
  const lash = { stroke: C.line, fill: "none", strokeLinecap: "round" } as const;

  if (kind === "happy") {
    return (
      <g>
        <path d={`M${cx - 16} ${cy + 8} Q${cx} ${cy - 16} ${cx + 16} ${cy + 8}`} {...lash} strokeWidth={4.4} />
        <path d={`M${cx + side * 14} ${cy + 1} Q${cx + side * 19} ${cy - 2} ${cx + side * 22} ${cy - 8}`} {...lash} strokeWidth={3} />
      </g>
    );
  }

  const wide = kind === "wide";
  const ry = wide ? 23 : 21;
  const dx = kind === "up" ? side * -1 + 3 : 0;
  const dy = kind === "up" ? -5 : 0;
  const irisRy = wide ? 22 : 20;
  const pupilRy = wide ? 6.4 : kind === "star" ? 6 : 9;
  const pupilRx = wide ? 4.6 : kind === "star" ? 4.8 : 5.8;

  return (
    <g>
      <clipPath id={clip}>
        <ellipse cx={cx} cy={cy} rx={17} ry={ry} />
      </clipPath>
      <ellipse cx={cx} cy={cy} rx={17} ry={ry} fill={C.eyeWhite} />
      <g clipPath={`url(#${clip})`}>
        <ellipse cx={cx + dx} cy={cy + dy + 1} rx={15.5} ry={irisRy} fill={`url(#${iris})`} />
        <ellipse cx={cx + dx} cy={cy + dy + 14} rx={10} ry={6} fill="#ffe0f3" opacity={0.55} />
        <ellipse cx={cx + dx} cy={cy + dy} rx={pupilRx} ry={pupilRy} fill={C.pupil} />
        {/* The shadow the upper lid casts, then the glints that make it an anime eye. */}
        <rect x={cx - 20} y={cy - 27} width={40} height={14} fill={C.line} opacity={0.3} />
        <ellipse cx={cx + dx - 5.5} cy={cy + dy - 8} rx={wide ? 6 : 5.4} ry={wide ? 7.2 : 6.4} fill="#fff" />
        <circle cx={cx + dx + 6.5} cy={cy + dy + 8} r={2.7} fill="#fff" opacity={0.95} />
        <circle cx={cx + dx + 2.5} cy={cy + dy + 13.5} r={1.3} fill="#fff" opacity={0.9} />
        {kind === "star" && <path d={`M${cx + 3} ${cy - 2} l1.6 4.4 l4.4 1.6 l-4.4 1.6 l-1.6 4.4 l-1.6 -4.4 l-4.4 -1.6 l4.4 -1.6 Z`} fill="#fff" />}
        {kind === "sleepy" && <rect x={cx - 20} y={cy - 27} width={40} height={25} fill={C.skin} />}
      </g>
      {kind === "sleepy" ? (
        <path d={`M${cx - 17} ${cy - 3} Q${cx} ${cy + 4} ${cx + 17} ${cy - 3}`} {...lash} strokeWidth={4.6} />
      ) : (
        <path d={`M${cx - 17} ${cy - 3} Q${cx - 15} ${cy - 24} ${cx} ${cy - ry - 4} Q${cx + 15} ${cy - 24} ${cx + 17} ${cy - 3}`} {...lash} strokeWidth={4.8} />
      )}
      <path d={`M${cx + side * 16.5} ${cy - 5} Q${cx + side * 21} ${cy - 8} ${cx + side * 24} ${cy - 15}`} {...lash} strokeWidth={3.4} />
      <path d={`M${cx - 12} ${cy + ry - 2} Q${cx} ${cy + ry + 2} ${cx + 12} ${cy + ry - 2}`} {...lash} stroke={C.lineSoft} strokeWidth={1.3} opacity={0.6} />
    </g>
  );
}

const BROWS: Record<Face["brows"], { left: string; right: string }> = {
  calm: { left: "M80 98 Q93 91 108 95", right: "M132 95 Q147 91 160 98" },
  raised: { left: "M80 92 Q93 84 108 89", right: "M132 89 Q147 84 160 92" },
  worried: { left: "M80 100 Q94 98 108 90", right: "M132 90 Q146 98 160 100" },
  thinking: { left: "M80 98 Q93 92 108 96", right: "M132 88 Q147 82 160 90" },
  cheer: { left: "M80 94 Q93 86 108 92", right: "M132 92 Q147 86 160 94" },
  sleepy: { left: "M80 102 Q94 98 108 101", right: "M132 101 Q146 98 160 102" },
};

/** The mouth shapes. `talk` is the open mouth that alternates with the resting one while she speaks. */
function Mouth({ shape, talking }: { shape: Face["mouth"]; talking: boolean }) {
  const stroke = { stroke: C.line, strokeWidth: 2.3, fill: "none", strokeLinecap: "round" } as const;
  const resting = (() => {
    switch (shape) {
      case "smile":
        return <path d="M112 164 Q120 173 128 164" {...stroke} />;
      case "small":
        return <path d="M114 166 Q120 170 126 166" {...stroke} />;
      case "flat":
        return <path d="M114 168 Q120 167 126 168" {...stroke} />;
      case "o":
        return <ellipse cx={120} cy={169} rx={4} ry={5.4} fill={C.mouth} stroke={C.line} strokeWidth={1.8} />;
      case "grin":
        return (
          <g>
            <path d="M108 162 Q120 184 132 162 Z" fill={C.mouth} stroke={C.line} strokeWidth={2.1} strokeLinejoin="round" />
            <path d="M111 163.4 Q120 168.5 129 163.4 L128.4 166.4 Q120 171 111.6 166.4 Z" fill="#fff" />
            <ellipse cx={120} cy={174} rx={6} ry={3.2} fill={C.tongue} />
          </g>
        );
    }
  })();

  return (
    <g>
      <g className={talking ? "sera-mouth-rest" : undefined}>{resting}</g>
      {talking && (
        <g className="sera-mouth-talk" opacity={0}>
          <ellipse cx={120} cy={169} rx={6.6} ry={5.2} fill={C.mouth} stroke={C.line} strokeWidth={1.8} />
          <ellipse cx={120} cy={172} rx={3.6} ry={1.9} fill={C.tongue} />
        </g>
      )}
    </g>
  );
}

type FaceArtProps = { face: Face; talking: boolean; id: (name: string) => string };

/** The head: skin, its shading, blush, nose, brows, eyes and mouth. Hair is drawn over it by the caller. */
export function FaceArt({ face, talking, id }: FaceArtProps) {
  const brows = BROWS[face.brows];
  return (
    <g>
      <clipPath id={id("face")}>
        <path d={FACE_PATH} />
      </clipPath>
      <path d={FACE_PATH} fill={C.skin} stroke={C.line} strokeWidth={2.2} strokeLinejoin="round" />
      <g clipPath={`url(#${id("face")})`}>
        {/* The bangs cast a soft shadow on the forehead, the cheek turns away from the light, and the chin is a little darker. */}
        <ellipse cx={120} cy={96} rx={62} ry={15} fill={C.skinShade} opacity={0.6} />
        <path d="M158 100 C178 124 170 166 128 190 C150 164 160 134 158 100 Z" fill={C.skinShade} opacity={0.45} />
        <ellipse cx={120} cy={192} rx={30} ry={9} fill={C.skinShade} opacity={0.5} />
      </g>

      <ellipse cx={85} cy={158} rx={11} ry={6} fill={C.blush} opacity={face.blush * 0.7} />
      <ellipse cx={155} cy={158} rx={11} ry={6} fill={C.blush} opacity={face.blush * 0.7} />
      {face.blush > 0.8 && (
        <g stroke={C.blush} strokeWidth={1.4} strokeLinecap="round" opacity={0.8}>
          <path d="M79 156 l2.6 5 M84 155 l2.6 5 M89 156 l2.6 5" />
          <path d="M151 156 l2.6 5 M156 155 l2.6 5 M161 156 l2.6 5" />
        </g>
      )}

      <path d="M118.6 158 Q120.4 160.4 122.4 158.4" stroke={C.skinDeep} strokeWidth={1.8} fill="none" strokeLinecap="round" />
      <g transform="translate(0 4)">
        <path d={brows.left} stroke={C.brow} strokeWidth={2.6} fill="none" strokeLinecap="round" />
        <path d={brows.right} stroke={C.brow} strokeWidth={2.6} fill="none" strokeLinecap="round" />
      </g>

      <g className="sera-eyes">
        <Eye cx={96} side={-1} kind={face.eyes} clip={id("eyeL")} iris={id("iris")} />
        <Eye cx={144} side={1} kind={face.eyes} clip={id("eyeR")} iris={id("iris")} />
      </g>
      <g transform="translate(0 4)">
        <Mouth shape={face.mouth} talking={talking} />
      </g>
    </g>
  );
}
