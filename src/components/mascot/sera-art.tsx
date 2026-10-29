"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { FACE_CROPS, spriteFor, spriteSrc, type SpriteId } from "@/lib/mascot/sprites";
import { POSES, type Mood, type Quirk, type StagePose } from "@/lib/mascot/types";
import { cn } from "@/lib/utils";

export { POSES };
export type Pose = StagePose;

/** The sprites are 2:3 (width to height). */
const SPRITE_RATIO = 2 / 3;

/** How long the old picture stays under the new one while it fades in, in milliseconds. */
const FADE_MS = 320;

/**
 * Sera, the guide. She is a set of painted anime illustrations ("sprites", `public/sera/sprites/<id>.webp`), one per way she
 * looks, and this component shows the right one for her mood, pose and quirk (see `src/lib/mascot/sprites.ts`), fading from
 * one to the next. Still pictures cannot move their mouths, so while she talks she gently bobs; she also breathes and sways a
 * little. All of that is CSS (`.sera-*` in globals.css) and is off for reduced motion.
 *
 * `half` (and `bust`, the same picture) is the whole waist-up illustration, for the stage and the tour. `avatar` is a round crop
 * of her face, for the corner button and the chat. If a picture fails to load, a small monogram stands in so nothing breaks.
 */
type SeraArtProps = {
  mood?: Mood;
  view?: "bust" | "half" | "avatar";
  pose?: Pose;
  /** A small idle behaviour to show right now, or none. */
  quirk?: Quirk | null;
  /** Width in pixels. The height follows. Ignored when CSS sizes her (the `fluid` class names below). */
  size?: number;
  /** She bobs a little while she speaks. */
  talking?: boolean;
  /** Draw a picture the owner supplies instead of the sprite set. */
  src?: string;
  /** Let CSS size her (for example `h-full w-auto`); she keeps her proportions either way. */
  fluid?: boolean;
  className?: string;
};

/** The picture, filling its box, or cropped to her face for the avatar. */
function Sprite({ id, avatar, onBroken }: { id: SpriteId; avatar: boolean; onBroken: () => void }) {
  const crop = FACE_CROPS[id];
  // The box is square for the avatar. The picture is scaled so the crop fills it, then moved so the face is in the middle.
  const style: CSSProperties = avatar
    ? { width: `${100 / crop.w}%`, left: `${-(crop.x / crop.w) * 100}%`, top: `${-((crop.y * (1 / SPRITE_RATIO)) / crop.w) * 100}%` }
    : { width: "100%", left: 0, top: 0 };
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={spriteSrc(id)}
      alt=""
      draggable={false}
      decoding="async"
      onError={onBroken}
      style={style}
      className="absolute max-w-none select-none"
    />
  );
}

/** Sera. Decorative: the words she says are always real text beside her. */
export function SeraArt({ mood = "calm", view = "bust", pose = "idle", quirk = null, size = 220, talking = false, src, fluid = false, className }: SeraArtProps) {
  const avatar = view === "avatar";
  const id = spriteFor(mood, pose, quirk);
  const [shown, setShown] = useState<SpriteId>(id);
  const [prev, setPrev] = useState<SpriteId | null>(null);
  const [broken, setBroken] = useState(false);

  // When her sprite changes, the old one stays underneath for a moment while the new one fades in.
  if (shown !== id) {
    setPrev(shown);
    setShown(id);
  }
  useEffect(() => {
    if (!prev) return;
    const timer = setTimeout(() => setPrev(null), FADE_MS);
    return () => clearTimeout(timer);
  }, [prev]);

  const ratio = avatar ? 1 : SPRITE_RATIO;
  const height = Math.round(size / ratio);

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={height} className={cn("block", className)} />;
  }

  return (
    <span
      aria-hidden
      className={cn("sera relative block", avatar ? "overflow-hidden" : "overflow-visible", talking && "sera-talking", className)}
      style={{ aspectRatio: `${ratio}`, ...(fluid ? {} : { width: size }) }}
    >
      {broken ? (
        <span className="absolute inset-0 flex items-center justify-center bg-surface font-display text-primary" style={{ fontSize: avatar ? size * 0.5 : size * 0.3 }}>
          S
        </span>
      ) : (
        <span className="sera-life absolute inset-0 block">
          {prev && <Sprite id={prev} avatar={avatar} onBroken={() => setBroken(true)} />}
          <span key={shown} className="sera-fade absolute inset-0 block">
            <Sprite id={shown} avatar={avatar} onBroken={() => setBroken(true)} />
          </span>
        </span>
      )}
    </span>
  );
}
