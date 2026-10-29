import { COLOR } from "./sera-palette";

type Ids = (name: string) => string;
export type P = readonly [number, number];
/** The four arm drawings the poses use. */
export type ArmPose = "idle" | "wave" | "point" | "cheer";

const f = (n: number) => n.toFixed(1);
const mirrorX = (p: P): P => [240 - p[0], p[1]];

/**
 * One side of a tapered limb along a curve (`a` to `c`, bending toward `b`), as a list of points; `w0` wide at the start and
 * `w1` at the end. A limb is its left side down and its right side back up, so it has an elbow-free taper instead of the
 * constant width of a stroked tube.
 */
function sides(a: P, b: P, c: P, w0: number, w1: number, from: number, to: number, steps: number): { left: string[]; right: string[] } {
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = from + ((to - from) * i) / steps;
    const x = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * b[0] + t * t * c[0];
    const y = (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * b[1] + t * t * c[1];
    const dx = 2 * (1 - t) * (b[0] - a[0]) + 2 * t * (c[0] - b[0]);
    const dy = 2 * (1 - t) * (b[1] - a[1]) + 2 * t * (c[1] - b[1]);
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const half = (w0 + (w1 - w0) * t) / 2;
    left.push(`${f(x + nx * half)} ${f(y + ny * half)}`);
    right.push(`${f(x - nx * half)} ${f(y - ny * half)}`);
  }
  return { left, right };
}

/** A limb as one closed outline. */
export function limb(a: P, b: P, c: P, w0: number, w1: number, from = 0, to = 1, steps = 18): string {
  const s = sides(a, b, c, w0, w1, from, to, steps);
  return `M${s.left.join(" L")} L${[...s.right].reverse().join(" L")} Z`;
}

/** Just one edge of a limb as an open line, for piping and seams that follow its side. */
export function edge(a: P, b: P, c: P, w0: number, w1: number, side: "left" | "right", from = 0, to = 1, steps = 18): string {
  const s = sides(a, b, c, w0, w1, from, to, steps);
  return `M${s[side].join(" L")}`;
}

/** The point at `t` along the curve, to put a hand, a cuff or a joint on it. */
export const along = (a: P, b: P, c: P, t: number): P => [
  (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * b[0] + t * t * c[0],
  (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * b[1] + t * t * c[1],
];

type Seg = readonly [P, P, P];

/** A closed symmetric outline from the left half: `start` at the centre top, cubic segments down the left side, then straight across and back up the mirrored right side. */
function symmetric(start: P, segs: readonly Seg[], bottomY: number): string {
  const left = segs.map(([c1, c2, e]) => `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(e[0])} ${f(e[1])}`).join(" ");
  const last = segs[segs.length - 1][2];
  const right = [...segs]
    .reverse()
    .map((seg, i, arr) => {
      const end = i === arr.length - 1 ? start : arr[i + 1][2];
      const [c1, c2] = seg;
      return `C${f(240 - c2[0])} ${f(c2[1])} ${f(240 - c1[0])} ${f(c1[1])} ${f(240 - end[0])} ${f(end[1])}`;
    })
    .join(" ");
  return `M${f(start[0])} ${f(start[1])} ${left} L${f(240 - last[0])} ${f(bottomY)} ${right} Z`.replace(`L${f(240 - last[0])} ${f(bottomY)}`, `L${f(last[0])} ${f(bottomY)} L${f(240 - last[0])} ${f(bottomY)}`);
}

/** The jacket: a high collar, sloping shoulders, a ribcage that tapers to a clear waist, then a hem that flares over the hips. Left half, mirrored. */
const JACKET_START: P = [106, 194];
const JACKET_SEGS: readonly Seg[] = [
  [[96, 196], [70, 198], [52, 208]],
  [[44, 212], [40, 226], [41, 244]],
  [[42, 272], [66, 296], [80, 326]],
  [[86, 342], [70, 366], [66, 392]],
];
const JACKET_BOTTOM = 392;
const JACKET_PATH = symmetric(JACKET_START, JACKET_SEGS, JACKET_BOTTOM);

/** The neck, the jacket with its collar, lapels, shirt, piping, waist belt and rank pin. Shaded flat on the right, lit on the left. */
export function Torso({ id }: { id: Ids }) {
  const lapel = (
    <g>
      <path d="M106 194 L84 206 L90 236 L120 266 L114 204 Z" fill={COLOR.jacketLight} stroke={COLOR.line} strokeWidth={2} strokeLinejoin="round" />
      <path d="M86 209 L105 198 L120 262" stroke={COLOR.piping} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
  return (
    <g>
      <defs>
        <linearGradient id={id("jacketSide")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={COLOR.jacketMid} />
          <stop offset="0.5" stopColor={COLOR.jacket} />
          <stop offset="1" stopColor={COLOR.jacketDeep} />
        </linearGradient>
        <clipPath id={id("jacketClip")}>
          <path d={JACKET_PATH} />
        </clipPath>
      </defs>

      <path d="M105 160 L105 200 C105 210 135 210 135 200 L135 160 Z" fill={COLOR.skinShade} stroke={COLOR.line} strokeWidth={2} strokeLinejoin="round" />
      <path d={JACKET_PATH} fill={`url(#${id("jacketSide")})`} stroke={COLOR.line} strokeWidth={2} strokeLinejoin="round" />

      <g clipPath={`url(#${id("jacketClip")})`}>
        {/* The side turned from the light, and a thin rim light on the lit edge. */}
        <path d="M150 198 C164 240 160 292 152 330 C158 350 172 372 178 392 L196 392 L196 190 Z" fill={COLOR.jacketDeep} opacity={0.45} />
        <path d="M54 214 C44 240 52 284 78 326" stroke={COLOR.piping} strokeWidth={1.8} fill="none" opacity={0.5} strokeLinecap="round" />
        {/* Princess seams from the shoulder to the waist: lines that describe the shape underneath. */}
        <path d="M78 212 C66 246 72 290 88 330" stroke={COLOR.piping} strokeWidth={1.4} fill="none" opacity={0.55} strokeLinecap="round" />
        <path d="M162 212 C174 246 168 290 152 330" stroke={COLOR.piping} strokeWidth={1.4} fill="none" opacity={0.4} strokeLinecap="round" />
        {/* Soft creases where the fabric gathers at the waist and under the arms. */}
        <path d="M86 322 q10 5 14 14 M154 322 q-10 5 -14 14 M96 340 q8 3 10 10" stroke={COLOR.jacketDeep} strokeWidth={1.6} fill="none" opacity={0.7} strokeLinecap="round" />
        {/* The belt line at the waist, and the hem. */}
        <path d="M80 328 C100 338 140 338 160 328" stroke={COLOR.piping} strokeWidth={2} fill="none" opacity={0.85} strokeLinecap="round" />
        <path d="M64 388 C90 396 150 396 176 388" stroke={COLOR.piping} strokeWidth={1.6} fill="none" opacity={0.6} strokeLinecap="round" />
      </g>
      <rect x={113} y={331} width={14} height={10} rx={2.5} fill={COLOR.jacket} stroke={COLOR.piping} strokeWidth={1.6} />

      {/* The shirt in the V, the lapels, and the rank pin. */}
      <path d="M104 198 L120 262 L136 198 Z" fill={COLOR.shirt} stroke={COLOR.line} strokeWidth={1.8} strokeLinejoin="round" />
      <path d="M112 206 L120 262 L128 206" stroke={COLOR.shirtShade} strokeWidth={1.4} fill="none" opacity={0.7} strokeLinecap="round" />
      {lapel}
      <g transform="translate(240 0) scale(-1 1)">{lapel}</g>
      <g transform="translate(158 262)">
        <path d="M0 -10 L8 -6.5 V2.5 C8 8 4 11 0 13 C-4 11 -8 8 -8 2.5 V-6.5 Z" fill={COLOR.jacket} stroke={COLOR.piping} strokeWidth={1.7} strokeLinejoin="round" />
        <path d="M-3.6 0 L0 -4.5 L3.6 0" stroke={COLOR.piping} strokeWidth={1.7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </g>
  );
}

type Piece = { a: P; b: P; c: P; w0: number; w1: number };

/** Draws limbs so that only their outer edge has an outline: all the outlines first, then all the fills on top, so the seams at a joint disappear. */
function Joined({ pieces, fill, joints = [] }: { pieces: readonly Piece[]; fill: string; joints?: readonly { at: P; r: number }[] }) {
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      {pieces.map((p, i) => (
        <path key={`o${i}`} d={limb(p.a, p.b, p.c, p.w0, p.w1)} fill={COLOR.line} stroke={COLOR.line} strokeWidth={3.6} />
      ))}
      {joints.map((j, i) => (
        <circle key={`jo${i}`} cx={j.at[0]} cy={j.at[1]} r={j.r} fill={COLOR.line} stroke={COLOR.line} strokeWidth={3.6} />
      ))}
      {pieces.map((p, i) => (
        <path key={`f${i}`} d={limb(p.a, p.b, p.c, p.w0, p.w1)} fill={fill} stroke="none" />
      ))}
      {joints.map((j, i) => (
        <circle key={`jf${i}`} cx={j.at[0]} cy={j.at[1]} r={j.r} fill={fill} stroke="none" />
      ))}
    </g>
  );
}

type ArmSpec = { shoulder: P; elbowIn: P; elbow: P; elbowOut: P; wrist: P };

/**
 * One arm in a fitted sleeve: an upper arm and a forearm that taper, an elbow with two small creases, a piping line down the
 * outer edge and a cuff at the wrist. The hand goes on the end of it, drawn by the caller at `wrist`.
 */
function Arm({ shoulder, elbowIn, elbow, elbowOut, wrist }: ArmSpec) {
  const upper: Piece = { a: shoulder, b: elbowIn, c: elbow, w0: 30, w1: 24 };
  const fore: Piece = { a: elbow, b: elbowOut, c: wrist, w0: 23, w1: 17 };
  return (
    <g>
      <Joined pieces={[upper, fore]} fill={COLOR.jacketLight} joints={[{ at: elbow, r: 11.5 }, { at: shoulder, r: 14 }]} />
      <path d={edge(upper.a, upper.b, upper.c, upper.w0, upper.w1, "left", 0.08, 1)} stroke={COLOR.piping} strokeWidth={1.5} fill="none" opacity={0.55} strokeLinecap="round" />
      <path d={`M${f(elbow[0] - 9)} ${f(elbow[1] + 2)} q9 4 18 0 M${f(elbow[0] - 7)} ${f(elbow[1] + 8)} q7 3 14 0`} stroke={COLOR.jacketDeep} strokeWidth={1.5} fill="none" opacity={0.75} strokeLinecap="round" />
      <path d={limb(fore.a, fore.b, fore.c, fore.w0, fore.w1, 0.84, 0.97)} fill={COLOR.jacket} stroke={COLOR.piping} strokeWidth={1.6} strokeLinejoin="round" />
    </g>
  );
}

const skin = { fill: COLOR.skin, stroke: COLOR.line, strokeWidth: 1.8, strokeLinejoin: "round" } as const;
const crease = { stroke: COLOR.skinShade, strokeWidth: 1.4, fill: "none", strokeLinecap: "round" } as const;

/**
 * A finger as a short chain of jointed segments, outlined: it starts at (`x`, `y`), points `angle` degrees clockwise from
 * straight up, and each joint turns `bend` more degrees, so fingers curve instead of being sticks.
 */
function Finger({ x, y, angle, parts, bend = 0, w = 5.4 }: { x: number; y: number; angle: number; parts: readonly number[]; bend?: number; w?: number }) {
  let px = x;
  let py = y;
  let a = angle;
  const pts: string[] = [`${f(px)} ${f(py)}`];
  for (const len of parts) {
    const rad = (a * Math.PI) / 180;
    px += Math.sin(rad) * len;
    py -= Math.cos(rad) * len;
    pts.push(`${f(px)} ${f(py)}`);
    a += bend;
  }
  const d = `M${pts.join(" L")}`;
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={COLOR.line} strokeWidth={w + 2.6} />
      <path d={d} stroke={COLOR.skin} strokeWidth={w} />
    </g>
  );
}

/** An open hand, fingers up, palm to the viewer, for waving. The origin is the wrist. */
function OpenHand() {
  return (
    <g>
      <Finger x={-9} y={-28} angle={-13} parts={[12, 10, 8]} bend={2} />
      <Finger x={-3} y={-30} angle={-3} parts={[13, 11, 9]} bend={1} />
      <Finger x={3} y={-30} angle={5} parts={[12.5, 10.5, 8.5]} bend={-1} />
      <Finger x={9} y={-28} angle={15} parts={[10, 8, 7]} bend={-2} w={5} />
      <Finger x={-11} y={-9} angle={-60} parts={[10, 9]} bend={8} w={5.6} />
      <path d="M-12 -1 C-14 -14 -13 -25 -9 -30 L9 -30 C13 -25 14 -14 12 -1 C6 5 -6 5 -12 -1 Z" {...skin} />
      <path d="M-8 -16 Q0 -13 8 -16" {...crease} />
    </g>
  );
}

/** A closed fist, for cheering. The origin is the middle of it. */
function Fist() {
  return (
    <g>
      <path d="M-14 -8 C-14 -17 14 -17 14 -8 L15 6 C15 15 -15 15 -15 6 Z" {...skin} />
      <path d="M-7 -10 L-7 3 M0 -11 L0 4 M7 -10 L7 3" {...crease} />
      <path d="M-14 4 C-20 2 -19 -9 -13 -9" {...skin} />
    </g>
  );
}

/** A fist with the index finger straight up, to say "look here". The origin is the wrist. */
function PointingHand() {
  return (
    <g>
      <Finger x={-6} y={-16} angle={-2} parts={[14, 12, 10]} bend={1} w={5.6} />
      <path d="M-13 -1 C-14 -10 -12 -17 -5 -18 L9 -17 C14 -13 15 -6 12 0 C6 6 -6 6 -13 -1 Z" {...skin} />
      <path d="M0 -14 Q6 -12 8 -6 M0 -8 Q5 -6 7 -1" {...crease} />
      <path d="M-13 -4 C-18 -6 -18 -15 -12 -16" {...skin} />
    </g>
  );
}

/** A hand hanging loosely, fingers slightly curled. The origin is the wrist, and it points down. */
function RelaxedHand() {
  return (
    <g>
      <Finger x={-8} y={24} angle={178} parts={[10, 9, 7]} bend={4} w={5} />
      <Finger x={-3} y={26} angle={181} parts={[11, 10, 8]} bend={4} />
      <Finger x={3} y={26} angle={184} parts={[10.5, 9.5, 7.5]} bend={3} />
      <Finger x={8} y={24} angle={189} parts={[8.5, 7, 6]} bend={3} w={4.8} />
      <Finger x={-11} y={6} angle={200} parts={[9, 8]} bend={-8} w={5.4} />
      <path d="M-11 0 C-13 10 -12 20 -8 26 L8 26 C12 20 13 10 11 0 C5 -4 -5 -4 -11 0 Z" {...skin} />
    </g>
  );
}

const L_SHOULDER: P = [58, 218];
const R_SHOULDER: P = [182, 218];

const hang = (side: "l" | "r"): ArmSpec => {
  const a: ArmSpec = { shoulder: L_SHOULDER, elbowIn: [36, 276], elbow: [42, 330], elbowOut: [42, 390], wrist: [52, 438] };
  return side === "l" ? a : { shoulder: mirrorX(a.shoulder), elbowIn: mirrorX(a.elbowIn), elbow: mirrorX(a.elbow), elbowOut: mirrorX(a.elbowOut), wrist: mirrorX(a.wrist) };
};

/** A relaxed arm at her side, with its hand. */
function Hanging({ side }: { side: "l" | "r" }) {
  const arm = hang(side);
  return (
    <g>
      <g transform={`translate(${f(arm.wrist[0])} ${f(arm.wrist[1] - 4)}) rotate(${side === "l" ? 5 : -5})`}>
        <RelaxedHand />
      </g>
      <Arm {...arm} />
    </g>
  );
}

/** The arms and hands. The torso is already drawn; these sit over it. */
export function Arms({ pose }: { pose: ArmPose }) {
  switch (pose) {
    case "wave":
    case "point": {
      const raised: ArmSpec = { shoulder: R_SHOULDER, elbowIn: [214, 262], elbow: [218, 330], elbowOut: [222, 276], wrist: [210, 228] };
      return (
        <g>
          <Hanging side="l" />
          <g transform="translate(210 228)">
            <g className={pose === "wave" ? "sera-hand-wave" : "sera-hand-bob"}>{pose === "wave" ? <OpenHand /> : <PointingHand />}</g>
          </g>
          <Arm {...raised} />
        </g>
      );
    }
    case "cheer": {
      const left: ArmSpec = { shoulder: L_SHOULDER, elbowIn: [26, 258], elbow: [20, 316], elbowOut: [14, 268], wrist: [34, 214] };
      const right: ArmSpec = { shoulder: R_SHOULDER, elbowIn: [214, 258], elbow: [220, 316], elbowOut: [226, 268], wrist: [206, 214] };
      return (
        <g>
          <g transform="translate(34 198)">
            <g className="sera-hand-bob">
              <Fist />
            </g>
          </g>
          <g transform="translate(206 198)">
            <g className="sera-hand-bob">
              <Fist />
            </g>
          </g>
          <Arm {...left} />
          <Arm {...right} />
        </g>
      );
    }
    default:
      return (
        <g>
          <Hanging side="l" />
          <Hanging side="r" />
        </g>
      );
  }
}

/** Slim tailored trousers (a gentle taper, a slight knee bend, one leg a little forward, cyan piping down the side) and ankle boots with a cyan trim. */
export function Legs() {
  const pelvis = "M66 380 L174 380 L172 454 C152 474 128 476 120 458 C112 476 88 474 68 454 Z";
  const left: [Piece, Piece] = [
    { a: [90, 396], b: [78, 490], c: [92, 560], w0: 58, w1: 40 },
    { a: [92, 560], b: [94, 650], c: [100, 736], w0: 40, w1: 25 },
  ];
  const right: [Piece, Piece] = [
    { a: [150, 396], b: [162, 490], c: [148, 560], w0: 58, w1: 40 },
    { a: [148, 560], b: [146, 652], c: [142, 742], w0: 40, w1: 25 },
  ];
  const boot = (cx: number, y: number) => (
    <g>
      <path
        d={`M${f(cx - 15)} ${f(y - 30)} L${f(cx + 15)} ${f(y - 30)} L${f(cx + 16)} ${f(y + 12)} C${f(cx + 26)} ${f(y + 18)} ${f(cx + 30)} ${f(y + 30)} ${f(cx + 24)} ${f(y + 40)} L${f(cx - 24)} ${f(y + 40)} C${f(cx - 30)} ${f(y + 30)} ${f(cx - 26)} ${f(y + 18)} ${f(cx - 16)} ${f(y + 12)} Z`}
        fill={COLOR.boot}
        stroke={COLOR.line}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path d={`M${f(cx - 15)} ${f(y - 24)} L${f(cx + 15)} ${f(y - 24)}`} stroke={COLOR.piping} strokeWidth={1.8} strokeLinecap="round" />
      <path d={`M${f(cx - 26)} ${f(y + 32)} C${f(cx - 14)} ${f(y + 24)} ${f(cx + 14)} ${f(y + 24)} ${f(cx + 26)} ${f(y + 32)}`} stroke={COLOR.bootLight} strokeWidth={1.6} fill="none" strokeLinecap="round" opacity={0.8} />
      <path d={`M${f(cx - 25)} ${f(y + 38)} L${f(cx + 25)} ${f(y + 38)} L${f(cx + 25)} ${f(y + 44)} L${f(cx - 25)} ${f(y + 44)} Z`} fill={COLOR.sole} stroke={COLOR.line} strokeWidth={1.6} strokeLinejoin="round" />
    </g>
  );
  return (
    <g>
      <ellipse cx={120} cy={780} rx={74} ry={6} fill="#000" opacity={0.28} />
      {boot(100, 736)}
      {boot(142, 742)}
      <path d={pelvis} fill={COLOR.line} stroke={COLOR.line} strokeWidth={3.6} strokeLinejoin="round" />
      <Joined pieces={[...left, ...right]} fill={COLOR.trousers} />
      <path d={pelvis} fill={COLOR.trousers} stroke="none" />
      <path d="M120 452 C119 520 120 560 120 604" stroke={COLOR.line} strokeWidth={0} />
      {/* The side piping, the crease down each leg and the knee. */}
      <path d={edge(left[0].a, left[0].b, left[0].c, left[0].w0, left[0].w1, "left", 0.02, 1)} stroke={COLOR.piping} strokeWidth={1.6} fill="none" opacity={0.6} strokeLinecap="round" />
      <path d={edge(left[1].a, left[1].b, left[1].c, left[1].w0, left[1].w1, "left", 0, 0.98)} stroke={COLOR.piping} strokeWidth={1.6} fill="none" opacity={0.6} strokeLinecap="round" />
      <path d={edge(right[0].a, right[0].b, right[0].c, right[0].w0, right[0].w1, "right", 0.02, 1)} stroke={COLOR.piping} strokeWidth={1.6} fill="none" opacity={0.6} strokeLinecap="round" />
      <path d={edge(right[1].a, right[1].b, right[1].c, right[1].w0, right[1].w1, "right", 0, 0.98)} stroke={COLOR.piping} strokeWidth={1.6} fill="none" opacity={0.6} strokeLinecap="round" />
      <path d="M84 556 q8 6 16 0 M140 556 q8 6 16 0 M88 600 q4 30 8 56 M152 600 q-4 30 -8 56" stroke={COLOR.trouserLight} strokeWidth={1.6} fill="none" opacity={0.8} strokeLinecap="round" />
    </g>
  );
}
