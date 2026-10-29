import { useId, type CSSProperties } from "react";
import type { Mood } from "@/lib/mascot/types";
import { cn } from "@/lib/utils";
import { Arms, Headset, POSES, Torso, type Pose } from "./sera/body";
import { FaceArt, FACES } from "./sera/face";
import { BackHair, FrontHair, Tails } from "./sera/hair";
import { C } from "./sera/palette";

export { POSES };
export type { Pose };

/**
 * Sera, the guide. An original anime style character drawn as inline SVG: pastel sky blue twin tails that fade to
 * pink, a fringe of separate locks with an ahoge, big glossy violet to pink eyes, a white sailor jacket with a navy
 * collar and a big pink bow, and a small coach headset that carries the System's cyan glow. One drawing gives every
 * mood by swapping eyes, brows, mouth, blush and sparkle, and every pose by swapping the arms.
 * Everything that moves is CSS (`.sera-*` in globals.css) and is off for reduced motion.
 *
 * The parts live in `./sera/`: `palette` (colors), `face`, `hair` and `body`. All views share one coordinate system
 * (240 wide), so the stage, the tour sheet and the chat crop the same drawing differently:
 * `bust` is head and shoulders, `half` is down to the waist with her arms, `avatar` is a close crop of the face.
 */
type SeraArtProps = {
  mood?: Mood;
  view?: "bust" | "half" | "avatar";
  /** What her arms do, in the half view. */
  pose?: Pose;
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
  half: { box: "0 0 240 400", w: 240, h: 400 },
  avatar: { box: "54 60 132 132", w: 132, h: 132 },
} as const;

/** Sera. Decorative: the words she says are always real text beside her. */
export function SeraArt({ mood = "calm", view = "bust", pose = "idle", size = 220, talking = false, src, className }: SeraArtProps) {
  const uid = useId().replace(/:/g, "");
  const id = (name: string) => `${uid}-${name}`;
  const face = FACES[mood];
  const v = VIEWS[view];
  const height = Math.round((size * v.h) / v.w);

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={height} className={cn("block", className)} />;
  }

  return (
    <svg
      viewBox={v.box}
      width={size}
      height={height}
      aria-hidden
      focusable="false"
      className={cn("sera block overflow-visible", talking && "sera-talking", className)}
      style={{ "--sera-glow": C.piping } as CSSProperties}
    >
      <defs>
        <linearGradient id={id("hair")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.hairLight} />
          <stop offset="0.38" stopColor={C.hairBase} />
          <stop offset="1" stopColor={C.hairMid} />
        </linearGradient>
        <linearGradient id={id("hairBack")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.hairMid} />
          <stop offset="1" stopColor={C.hairShade} />
        </linearGradient>
        <linearGradient id={id("tail")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.hairBase} />
          <stop offset="0.6" stopColor={C.hairMid} />
          <stop offset="1" stopColor={C.hairTip} />
        </linearGradient>
        <linearGradient id={id("iris")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.irisTop} />
          <stop offset="0.5" stopColor={C.irisMid} />
          <stop offset="1" stopColor={C.irisBottom} />
        </linearGradient>
        <linearGradient id={id("jacket")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.jacket} />
          <stop offset="1" stopColor={C.jacketShade} />
        </linearGradient>
      </defs>

      <g className="sera-breathe">
        <BackHair id={id} />
        <Tails id={id} />
        {/* The body sits 14 up, so the neck is short and the head reads big, like anime. */}
        <g transform="translate(0 -14)">
          {view !== "avatar" && <Torso id={id} half={view === "half"} />}
          {view === "half" && <Arms pose={pose} />}
        </g>

        {/* The head, tilted a little with the mood. */}
        <g transform={`rotate(${face.tilt} 120 180)`}>
          <FaceArt face={face} talking={talking} id={id} />
          <FrontHair id={id} />
          <Headset />
        </g>

        {face.sparkle && (
          <g>
            <path className="sera-sparkle" d="M206 52 L210 64 L222 68 L210 72 L206 84 L202 72 L190 68 L202 64 Z" fill={C.hairLight} stroke={C.piping} strokeWidth={1.6} strokeLinejoin="round" />
            <path className="sera-sparkle" d="M34 74 L36.6 81 L44 83.6 L36.6 86.2 L34 93.4 L31.4 86.2 L24 83.6 L31.4 81 Z" fill={C.hairTip} stroke={C.ribbonDark} strokeWidth={1.2} strokeLinejoin="round" />
          </g>
        )}
      </g>
    </svg>
  );
}
