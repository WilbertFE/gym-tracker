import type { Mood, Quirk, StagePose } from "./types";

/**
 * Sera is a set of illustrations ("sprites"), one per way she looks: an expression and a pose together, painted as one
 * picture, like a visual novel. This module decides which one to show for a mood, a pose and a quirk. It is pure, so it is
 * tested. The pictures live in `public/sera/sprites/<id>.webp` (transparent, waist up, 2:3).
 *
 * Not every sprite has been made yet. {@link AVAILABLE} lists the ones that exist; a missing one falls back to the nearest
 * that does, so adding a picture is: drop `<id>.webp` into the folder and add its id to `AVAILABLE`.
 */
export type SpriteId = "calm" | "smug" | "happy" | "cheer" | "thinking" | "surprised" | "sleepy" | "flustered" | "annoyed" | "taunt" | "point" | "hairflip";

export const SPRITE_IDS: readonly SpriteId[] = ["calm", "smug", "happy", "cheer", "thinking", "surprised", "sleepy", "flustered", "annoyed", "taunt", "point", "hairflip"];

/** The sprites that have a picture. Keep in step with `public/sera/sprites/`. */
export const AVAILABLE: readonly SpriteId[] = ["calm", "smug", "happy", "cheer", "thinking"];

/** What to show instead, nearest first, when a sprite has no picture yet. `calm` is the last resort for all of them. */
const FALLBACKS: Record<SpriteId, readonly SpriteId[]> = {
  calm: [],
  smug: ["calm"],
  happy: ["calm"],
  cheer: ["happy"],
  thinking: ["calm"],
  surprised: ["cheer", "thinking"],
  sleepy: ["calm"],
  flustered: ["thinking", "smug"],
  annoyed: ["smug"],
  taunt: ["smug"],
  point: ["thinking", "smug"],
  hairflip: ["smug"],
};

const BY_QUIRK: Record<Quirk, SpriteId> = { tongue: "taunt", puff: "annoyed", hmph: "annoyed", hairflip: "hairflip" };

const BY_POSE: Record<StagePose, SpriteId | null> = {
  idle: null,
  wave: "happy",
  point: "point",
  cheer: "cheer",
  smug: "smug",
  crossed: "annoyed",
  taunt: "taunt",
  hairflip: "hairflip",
};

const BY_MOOD: Record<Mood, SpriteId> = {
  calm: "calm",
  happy: "happy",
  cheer: "cheer",
  thinking: "thinking",
  surprised: "surprised",
  sleepy: "sleepy",
  smug: "smug",
  flustered: "flustered",
  annoyed: "annoyed",
};

/** The sprite she would like to be, before checking that its picture exists. A quirk wins, then a pose, then the mood. */
export const wantedSprite = (mood: Mood, pose: StagePose, quirk: Quirk | null): SpriteId => (quirk ? BY_QUIRK[quirk] : (BY_POSE[pose] ?? BY_MOOD[mood]));

/** The sprite to show: the wanted one if it has a picture, else the nearest that does. */
export function spriteFor(mood: Mood, pose: StagePose = "idle", quirk: Quirk | null = null): SpriteId {
  const wanted = wantedSprite(mood, pose, quirk);
  for (const id of [wanted, ...FALLBACKS[wanted], "calm" as const]) if (AVAILABLE.includes(id)) return id;
  return "calm";
}

export const spriteSrc = (id: SpriteId): string => `/sera/sprites/${id}.webp`;

/**
 * Where her face is in each sprite, as a square crop for the round avatar: `x` and `y` are the corner and `w` the width,
 * all as fractions of the picture's width and height (the picture is 2:3, so the crop is `w` wide and two thirds of `w` tall).
 */
export type FaceCrop = { x: number; y: number; w: number };

export const FACE_CROPS: Record<SpriteId, FaceCrop> = {
  calm: { x: 0.27, y: 0.04, w: 0.46 },
  smug: { x: 0.29, y: 0.045, w: 0.46 },
  happy: { x: 0.27, y: 0.035, w: 0.46 },
  cheer: { x: 0.27, y: 0.025, w: 0.46 },
  thinking: { x: 0.27, y: 0.025, w: 0.46 },
  surprised: { x: 0.27, y: 0.035, w: 0.46 },
  sleepy: { x: 0.27, y: 0.04, w: 0.46 },
  flustered: { x: 0.27, y: 0.04, w: 0.46 },
  annoyed: { x: 0.27, y: 0.04, w: 0.46 },
  taunt: { x: 0.27, y: 0.035, w: 0.46 },
  point: { x: 0.27, y: 0.035, w: 0.46 },
  hairflip: { x: 0.27, y: 0.035, w: 0.46 },
};
