import { gradeRank, SLOTS, type Equipment, type Grade, type Slot } from "@/lib/items";

/**
 * How the items look, as plain data: which icon each one has, what kind of aura art an aura is, how a
 * nameplate is dressed for its grade, and how a preview is laid over what is worn. The drawing is in
 * `src/components/items/`; keeping the choices here means they are easy to test and to change in one place.
 */

/** The Phosphor icons used for items. Each is a plain name, mapped to the component in `item-icon.tsx`. */
export type ItemIconName =
  | "Shield" | "Diamond" | "Star" | "Hexagon" | "Crown"
  | "Snowflake" | "Leaf" | "Wind" | "FlowerLotus" | "MoonStars" | "Sparkle" | "Sun"
  | "Feather" | "SunHorizon" | "Moon" | "GearSix" | "ShieldCheck" | "Flame" | "Mountains"
  | "Fire" | "Palette" | "Knife" | "Axe" | "Lightning" | "Hoodie" | "CoatHanger" | "Skull";

export const ITEM_ICONS: Record<string, ItemIconName> = {
  "frame-steel": "Shield",
  "frame-cobalt": "Diamond",
  "frame-runic": "Star",
  "frame-hex": "Hexagon",
  "frame-apex": "Crown",
  "aura-frost": "Snowflake",
  "aura-mint": "Leaf",
  "aura-sand": "Wind",
  "aura-rose": "FlowerLotus",
  "aura-violet": "MoonStars",
  "aura-gilded": "Sparkle",
  "aura-sovereign": "Sun",
  "plate-rookie": "Feather",
  "plate-early": "SunHorizon",
  "plate-night": "Moon",
  "plate-grinder": "GearSix",
  "plate-ironclad": "ShieldCheck",
  "plate-relentless": "Flame",
  "plate-ascendant": "Mountains",
  "look-ember": "Fire",
  "look-aurora": "Palette",
  "weapon-steel": "Knife",
  "weapon-ember": "Flame",
  "weapon-frost": "Snowflake",
  "weapon-verdant": "Leaf",
  "weapon-violet": "Lightning",
  "weapon-sunbrand": "Sun",
  "outfit-snow": "Hoodie",
  "outfit-scout": "CoatHanger",
  "outfit-crimson": "Axe",
  "outfit-violet": "Hoodie",
  "outfit-gilded": "Crown",
  "weapon-voidreaver": "Skull",
  "outfit-eclipse": "MoonStars",
  "aura-bloodmoon": "Moon",
};

/** What an aura is made of: a soft glow, one or two thin rings, a ring with twinkling sparks, ice crystals, or radiant rays. */
export type AuraKind = "halo" | "ring" | "crystals" | "sparks" | "rays";

export const AURA_ART: Record<string, AuraKind> = {
  "aura-frost": "crystals",
  "aura-mint": "halo",
  "aura-sand": "halo",
  "aura-rose": "ring",
  "aura-violet": "ring",
  "aura-gilded": "sparks",
  "aura-sovereign": "rays",
  "aura-bloodmoon": "rays",
};

/** A bare colour, for an aura that is not an item (or one that is not known): a plain halo. */
export const auraKindFor = (itemId: string | null | undefined): AuraKind => (itemId ? (AURA_ART[itemId] ?? "halo") : "halo");

/** A nameplate is dressed for its grade, so rarity shows without reading anything. */
export type PlateStyle = "plain" | "bracket" | "gradient" | "crest";

export const plateStyleFor = (grade: Grade): PlateStyle =>
  ({ common: "plain", uncommon: "plain", rare: "bracket", epic: "gradient", legendary: "crest", mythic: "crest" } as const)[grade];

/** The small diamonds next to a grade name: one for Common up to six for Mythic. */
export const gradePips = (grade: Grade): number => gradeRank(grade) + 1;

/** What is being tried on. A slot with a string previews that item, `null` previews taking it off, a missing slot is left as worn. */
export type LoadoutPreview = Partial<Record<Slot, string | null>>;

/** What is worn with a preview laid over it. Neither argument is changed. */
export function mergeLoadout(worn: Equipment, preview: LoadoutPreview): Equipment {
  const merged: Equipment = { ...worn };
  for (const slot of SLOTS) {
    const choice = preview[slot.id];
    if (choice !== undefined) merged[slot.id] = choice;
  }
  return merged;
}

/** The slots where the preview differs from what is worn. */
export function previewChanges(worn: Equipment, preview: LoadoutPreview): Slot[] {
  return SLOTS.filter((s) => preview[s.id] !== undefined && preview[s.id] !== worn[s.id]).map((s) => s.id);
}
