/**
 * The cosmetic items that quest chests hold. They change how things look and never how much XP you earn,
 * so the leaderboard stays fair. Every item has a grade, from Common to Mythic, and fits one slot.
 * Names are plain words on purpose, nothing here comes from any game or film.
 */
export type Grade = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";

/** Lowest to highest. The colors follow the usual game ladder: white, green, blue, purple, gold, red. */
export const GRADE_ORDER: readonly Grade[] = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];

export type GradeInfo = {
  id: Grade;
  name: string;
  /** For the canvas and the SVG art. The same colors are CSS tokens in globals.css (--grade-*). */
  color: string;
  /** What a repeat of an item of this grade pays, once the whole grade is owned. */
  duplicateXp: number;
};

export const GRADES: Record<Grade, GradeInfo> = {
  common: { id: "common", name: "Common", color: "#e5e9f0", duplicateXp: 3 },
  uncommon: { id: "uncommon", name: "Uncommon", color: "#4ade80", duplicateXp: 4 },
  rare: { id: "rare", name: "Rare", color: "#4aa8ff", duplicateXp: 6 },
  epic: { id: "epic", name: "Epic", color: "#b07cff", duplicateXp: 12 },
  legendary: { id: "legendary", name: "Legendary", color: "#ffb83d", duplicateXp: 25 },
  mythic: { id: "mythic", name: "Mythic", color: "#ff4d5e", duplicateXp: 50 },
};

export const gradeRank = (grade: Grade): number => GRADE_ORDER.indexOf(grade);

/**
 * What an item decorates:
 * - frame: a decoration around the rank badge
 * - aura: the glow color of the level number, the XP bar and the rank letter
 * - plate: a short nameplate shown next to the nickname
 * - look: an extra look for share images
 */
export type Slot = "frame" | "aura" | "plate" | "look";

export const SLOTS: readonly { id: Slot; name: string; hint: string }[] = [
  { id: "frame", name: "Badge frame", hint: "Around your rank badge." },
  { id: "aura", name: "Aura", hint: "The glow of your level and XP bar." },
  { id: "plate", name: "Nameplate", hint: "Shown next to your nickname." },
  { id: "look", name: "Share look", hint: "An extra look for share images." },
];

export type FrameStyle = "steel" | "cobalt" | "runic" | "hex" | "apex";

export type Item = {
  id: string;
  slot: Slot;
  grade: Grade;
  name: string;
  /** One line shown with the item. */
  blurb: string;
  /**
   * What it does, by slot: the frame style, the aura color, the nameplate text, or the share look id.
   */
  value: string;
};

export const ITEMS: readonly Item[] = [
  // Common
  { id: "aura-frost", slot: "aura", grade: "common", name: "Frost", blurb: "A cold, pale blue glow.", value: "#8ecbff" },
  { id: "aura-sand", slot: "aura", grade: "common", name: "Sand", blurb: "A warm, soft glow.", value: "#e8d8a8" },
  { id: "plate-rookie", slot: "plate", grade: "common", name: "Rookie", blurb: "Everyone starts somewhere.", value: "Rookie" },
  // Uncommon
  { id: "aura-mint", slot: "aura", grade: "uncommon", name: "Mint", blurb: "A fresh, cool green glow.", value: "#6fe3c1" },
  { id: "plate-early", slot: "plate", grade: "uncommon", name: "Early Bird", blurb: "For the morning sessions.", value: "Early Bird" },
  { id: "plate-night", slot: "plate", grade: "uncommon", name: "Night Owl", blurb: "For the late sessions.", value: "Night Owl" },
  // Rare
  { id: "frame-steel", slot: "frame", grade: "rare", name: "Steel", blurb: "A plain steel ring around the badge.", value: "steel" },
  { id: "frame-cobalt", slot: "frame", grade: "rare", name: "Cobalt", blurb: "A blue double ring.", value: "cobalt" },
  { id: "aura-rose", slot: "aura", grade: "rare", name: "Rose", blurb: "A rose pink glow.", value: "#ff7aa8" },
  { id: "aura-violet", slot: "aura", grade: "rare", name: "Violet", blurb: "A deep violet glow.", value: "#a98bff" },
  { id: "plate-grinder", slot: "plate", grade: "rare", name: "Grinder", blurb: "Day after day.", value: "Grinder" },
  { id: "plate-ironclad", slot: "plate", grade: "rare", name: "Ironclad", blurb: "Hard to move.", value: "Ironclad" },
  // Epic
  { id: "frame-runic", slot: "frame", grade: "epic", name: "Runic", blurb: "A ring cut with small marks.", value: "runic" },
  { id: "frame-hex", slot: "frame", grade: "epic", name: "Hex", blurb: "A six sided frame.", value: "hex" },
  { id: "aura-gilded", slot: "aura", grade: "epic", name: "Gilded", blurb: "A rich golden glow.", value: "#ffcf5c" },
  { id: "plate-relentless", slot: "plate", grade: "epic", name: "Relentless", blurb: "It does not stop.", value: "Relentless" },
  { id: "look-ember", slot: "look", grade: "epic", name: "Ember", blurb: "A glowing orange look for share images.", value: "ember" },
  // Legendary (Mythic has no items yet; the tier, its color and its art are ready for when it gets some)
  { id: "frame-apex", slot: "frame", grade: "legendary", name: "Apex", blurb: "A gold crest with a slow shimmer.", value: "apex" },
  { id: "aura-sovereign", slot: "aura", grade: "legendary", name: "Sovereign", blurb: "A pale gold glow, the brightest there is.", value: "#ffe08a" },
  { id: "plate-ascendant", slot: "plate", grade: "legendary", name: "Ascendant", blurb: "Always climbing.", value: "Ascendant" },
  { id: "look-aurora", slot: "look", grade: "legendary", name: "Aurora", blurb: "A shifting green and violet look for share images.", value: "aurora" },
];

/** The colors of the two chest-only share looks: a gradient from top to bottom and the accent. */
export const LOOK_COLORS: Record<string, { from: string; to: string; accent: string }> = {
  ember: { from: "#4a1a06", to: "#0a0604", accent: "#ff8a3d" },
  aurora: { from: "#0b3a3f", to: "#2a1457", accent: "#7cf5c8" },
};

const byId = new Map(ITEMS.map((item) => [item.id, item]));

export const itemById = (id: string): Item | null => byId.get(id) ?? null;

/** The nameplate whose word this is. Plate words are unique, so a word on the leaderboard names its item. */
export const plateByWord = (word: string | null | undefined): Item | null =>
  word ? (ITEMS.find((i) => i.slot === "plate" && i.value === word) ?? null) : null;

export const itemsOfGrade = (grade: Grade): Item[] => ITEMS.filter((item) => item.grade === grade);

export const itemsOfSlot = (slot: Slot): Item[] => ITEMS.filter((item) => item.slot === slot);

/** What is worn: one item id per slot, or null for none. */
export type Equipment = Record<Slot, string | null>;

export const NO_EQUIPMENT: Equipment = { frame: null, aura: null, plate: null, look: null };

/** The equipped items that exist and fit their slot, as items. Anything unknown is dropped. */
export function equippedItems(equipment: Equipment): Partial<Record<Slot, Item>> {
  const worn: Partial<Record<Slot, Item>> = {};
  for (const slot of SLOTS) {
    const item = equipment[slot.id] ? itemById(equipment[slot.id]!) : null;
    if (item && item.slot === slot.id) worn[slot.id] = item;
  }
  return worn;
}
