import { C } from "./palette";

type Ids = (name: string) => string;

export type Pose = "idle" | "wave" | "point" | "cheer";

export const POSES: readonly Pose[] = ["idle", "wave", "point", "cheer"];

const outline = { stroke: C.line, strokeWidth: 2, strokeLinejoin: "round" } as const;
const skin = { fill: C.skin, ...outline } as const;

/** The neck, the white sailor jacket with its navy collar, the big pink bow and the skirt line. */
export function Torso({ id, half }: { id: Ids; half: boolean }) {
  return (
    <g>
      <path d="M106 170 L106 224 C106 236 134 236 134 224 L134 170 Z" fill={C.skinShade} {...outline} />
      <path
        d={half ? "M34 420 L38 300 C42 258 74 236 106 226 L134 226 C166 236 198 258 202 300 L206 420 Z" : "M38 320 L38 300 C42 258 74 236 106 226 L134 226 C166 236 198 258 202 300 L202 320 Z"}
        fill={`url(#${id("jacket")})`}
        {...outline}
      />
      <path d="M106 226 L120 270 L134 226 Z" fill={C.skin} />

      {/* The sailor collar: two navy panels with cyan stripes. */}
      <path d="M62 250 C76 238 92 230 106 226 L122 292 C100 288 76 274 62 250 Z" fill={C.navy} {...outline} />
      <path d="M178 250 C164 238 148 230 134 226 L118 292 C140 288 164 274 178 250 Z" fill={C.navy} {...outline} />
      <g fill="none" stroke={C.piping} strokeWidth={1.8} strokeLinecap="round">
        <path d="M69 250 C82 241 95 235 106 231" />
        <path d="M76 256 C88 248 98 242 108 238" />
        <path d="M171 250 C158 241 145 235 134 231" />
        <path d="M164 256 C152 248 142 242 132 238" />
      </g>

      {half && (
        <g>
          {/* The pleated skirt, just the top of it. */}
          <path d="M34 388 L206 388 L206 420 L34 420 Z" fill={C.navy} {...outline} />
          <path d="M34 394 L206 394" stroke={C.piping} strokeWidth={1.8} />
          <path d="M70 396 L66 420 M104 396 L102 420 M136 396 L138 420 M170 396 L174 420" stroke={C.navyDeep} strokeWidth={1.6} opacity={0.7} />
        </g>
      )}

      {/* The bow: two loops, a knot and two tails. */}
      <g>
        <path d="M120 290 C98 268 82 290 92 306 C100 316 114 304 120 294 Z" fill={C.ribbon} {...outline} strokeWidth={1.8} />
        <path d="M120 290 C142 268 158 290 148 306 C140 316 126 304 120 294 Z" fill={C.ribbon} {...outline} strokeWidth={1.8} />
        <path d="M108 292 C102 288 96 292 98 300" stroke={C.ribbonLight} strokeWidth={2} fill="none" strokeLinecap="round" />
        <path d="M132 292 C138 288 144 292 142 300" stroke={C.ribbonLight} strokeWidth={2} fill="none" strokeLinecap="round" />
        <path d="M116 296 L104 332 L113 326 L119 338 L123 298 Z" fill={C.ribbonDark} {...outline} strokeWidth={1.8} />
        <path d="M124 296 L136 332 L127 326 L121 338 L117 298 Z" fill={C.ribbon} {...outline} strokeWidth={1.8} />
        <ellipse cx={120} cy={293} rx={8} ry={7.5} fill={C.ribbonDark} {...outline} strokeWidth={1.8} />
      </g>
    </g>
  );
}

/** The small coach headset: an ear cup with the System's glow, and a mic on a thin boom. Drawn over the hair. */
export function Headset() {
  return (
    <g>
      <path d="M62 154 C66 172 84 180 104 174" stroke={C.lineSoft} strokeWidth={2.2} fill="none" strokeLinecap="round" />
      <circle cx={105} cy={174} r={3.6} fill={C.piping} stroke={C.line} strokeWidth={1.4} className="sera-glow" />
      <circle cx={62} cy={142} r={13} fill={C.piping} opacity={0.22} className="sera-glow" />
      <circle cx={62} cy={142} r={10.5} fill={C.jacket} {...outline} />
      <circle cx={62} cy={142} r={6} fill={C.navy} stroke={C.line} strokeWidth={1.4} />
      <circle cx={62} cy={142} r={2.6} fill={C.piping} />
    </g>
  );
}

/** A sleeve is a short, wide, outlined stroke, with a navy cuff at its end. */
function Sleeve({ d, cuff }: { d: string; cuff: { x: number; y: number; angle: number } }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={C.line} strokeWidth={34} />
      <path d={d} stroke={C.jacket} strokeWidth={30} />
      <rect x={-16} y={-3.5} width={32} height={7} rx={2} fill={C.navy} stroke={C.line} strokeWidth={1.4} transform={`translate(${cuff.x} ${cuff.y}) rotate(${cuff.angle})`} />
    </g>
  );
}

/** A bare forearm, outlined. */
function Forearm({ d }: { d: string }) {
  return (
    <g fill="none" strokeLinecap="round">
      <path d={d} stroke={C.line} strokeWidth={17} />
      <path d={d} stroke={C.skin} strokeWidth={13} />
    </g>
  );
}

const creases = { stroke: C.skinDeep, strokeWidth: 1.5, fill: "none", strokeLinecap: "round" } as const;

/** An open hand, fingers up, for waving. The origin is the wrist. */
function OpenHand() {
  const fingers = [
    { x: -10.5, h: 21, r: -14 },
    { x: -3.5, h: 25, r: -4 },
    { x: 3.5, h: 24, r: 5 },
    { x: 10.5, h: 19, r: 15 },
  ];
  return (
    <g>
      {fingers.map((f) => (
        <rect key={f.x} x={f.x - 3.4} y={-12 - f.h} width={6.8} height={f.h} rx={3.4} {...skin} strokeWidth={1.8} transform={`rotate(${f.r} ${f.x} -12)`} />
      ))}
      <ellipse cx={-14} cy={-10} rx={4.6} ry={8.4} {...skin} strokeWidth={1.8} transform="rotate(-38 -14 -10)" />
      <ellipse cx={0} cy={-6} rx={14} ry={12} {...skin} />
      <path d="M-7 -12 Q0 -8 7 -12" {...creases} />
    </g>
  );
}

/** A fist, for cheering. The origin is the middle of the fist. */
function Fist() {
  return (
    <g>
      <ellipse cx={0} cy={0} rx={14.5} ry={13} {...skin} />
      <path d="M-9 -5 Q0 -9 9 -5 M-9 1 Q0 -3 9 1 M-8 7 Q0 4 8 7" {...creases} />
      <ellipse cx={-12} cy={5} rx={4.8} ry={7} {...skin} strokeWidth={1.8} transform="rotate(20 -12 5)" />
    </g>
  );
}

/** A hand with one finger up, to say "look here". The origin is the wrist. */
function PointingHand() {
  return (
    <g>
      <rect x={-3.6} y={-52} width={7.2} height={36} rx={3.6} {...skin} strokeWidth={1.8} />
      <ellipse cx={0} cy={-8} rx={14} ry={12} {...skin} />
      <path d="M-8 -10 Q0 -6 8 -10 M-8 -3 Q0 1 8 -3" {...creases} />
      <ellipse cx={-13} cy={-8} rx={4.4} ry={7} {...skin} strokeWidth={1.8} transform="rotate(-25 -13 -8)" />
    </g>
  );
}

/** Two hands held together in front, for the calm pose. */
function ClaspedHands() {
  return (
    <g>
      <ellipse cx={120} cy={362} rx={24} ry={13} {...skin} />
      <path d="M104 358 Q120 368 136 358 M108 366 L132 366" {...creases} />
      <ellipse cx={103} cy={364} rx={5} ry={7.5} {...skin} strokeWidth={1.8} transform="rotate(30 103 364)" />
    </g>
  );
}

const leftDown = (
  <g>
    <Sleeve d="M56 252 C46 272 46 296 52 316" cuff={{ x: 52, y: 318, angle: -8 }} />
    <Forearm d="M52 322 C54 348 60 366 66 384" />
    <ellipse cx={66} cy={392} rx={13} ry={11} {...skin} />
  </g>
);

/** The arms and hands of the half body. The torso is already drawn; these sit over it. */
export function Arms({ pose }: { pose: Pose }) {
  switch (pose) {
    case "wave":
      return (
        <g>
          {leftDown}
          <Sleeve d="M184 252 C204 258 218 252 222 236" cuff={{ x: 222, y: 232, angle: 12 }} />
          <Forearm d="M222 230 C226 212 224 196 220 178" />
          <g transform="translate(220 176)">
            <g className="sera-hand-wave">
              <OpenHand />
            </g>
          </g>
        </g>
      );
    case "point":
      return (
        <g>
          {leftDown}
          <Sleeve d="M184 252 C204 258 218 252 222 236" cuff={{ x: 222, y: 232, angle: 12 }} />
          <Forearm d="M222 230 C226 212 224 196 220 180" />
          <g transform="translate(220 178)">
            <g className="sera-hand-bob">
              <PointingHand />
            </g>
          </g>
        </g>
      );
    case "cheer":
      return (
        <g>
          <g>
            <Sleeve d="M56 252 C30 250 14 238 12 218" cuff={{ x: 12, y: 214, angle: 0 }} />
            <Forearm d="M12 210 C10 196 14 182 20 170" />
            <g transform="translate(20 160)">
              <g className="sera-hand-bob">
                <Fist />
              </g>
            </g>
          </g>
          <g transform="translate(240 0) scale(-1 1)">
            <Sleeve d="M56 252 C30 250 14 238 12 218" cuff={{ x: 12, y: 214, angle: 0 }} />
            <Forearm d="M12 210 C10 196 14 182 20 170" />
            <g transform="translate(20 160)">
              <g className="sera-hand-bob">
                <Fist />
              </g>
            </g>
          </g>
        </g>
      );
    default:
      return (
        <g>
          <Sleeve d="M56 252 C46 270 44 290 50 308" cuff={{ x: 50, y: 310, angle: -8 }} />
          <Forearm d="M50 314 C54 340 80 356 106 360" />
          <g transform="translate(240 0) scale(-1 1)">
            <Sleeve d="M56 252 C46 270 44 290 50 308" cuff={{ x: 50, y: 310, angle: -8 }} />
            <Forearm d="M50 314 C54 340 80 356 106 360" />
          </g>
          <ClaspedHands />
        </g>
      );
  }
}
