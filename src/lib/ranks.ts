/**
 * The rank ladder. A rank starts at a level and lasts until the next rank begins. Everything about
 * how a rank looks (colors, frame, symbol) is data here, so the badge component, the share card and
 * the level page all draw from one place and a rank can be renamed or recolored in one edit.
 */
export type RankFrame = "ring" | "shield" | "winged" | "crowned";

export type RankGlyph =
  | "chevron"
  | "plate"
  | "plates"
  | "dumbbell"
  | "barbell"
  | "flame"
  | "kettlebell"
  | "crown"
  | "trophy"
  | "bolt"
  | "skull"
  | "star"
  | "infinity";

export type RankLetter = "E" | "D" | "C" | "B" | "A" | "S" | "SS" | "SSS";

export type Rank = {
  id: string;
  name: string;
  /** First level of this rank. */
  minLevel: number;
  /** The grade shown on the status window, from E up to SSS. Several ranks share one. */
  letter: RankLetter;
  frame: RankFrame;
  glyph: RankGlyph;
  /** Gradient of the badge body, top to bottom, and the colors of its rim, glow and symbol. */
  colors: { from: string; to: string; rim: string; glow: string; ink: string };
  /** The two highest ranks shimmer. */
  animated: boolean;
  /** One line on the ladder. */
  tagline: string;
};

const rank = (r: Omit<Rank, "animated"> & { animated?: boolean }): Rank => ({ animated: false, ...r });

export const RANKS: readonly Rank[] = [
  rank({
    id: "warm-up",
    name: "Warm-Up",
    minLevel: 1,
    letter: "E",
    frame: "ring",
    glyph: "chevron",
    colors: { from: "#64748b", to: "#334155", rim: "#94a3b8", glow: "#64748b", ink: "#e2e8f0" },
    tagline: "Everyone starts with a warm-up.",
  }),
  rank({
    id: "iron-rookie",
    name: "Iron Rookie",
    minLevel: 5,
    letter: "D",
    frame: "shield",
    glyph: "plate",
    colors: { from: "#c2763a", to: "#7c3f12", rim: "#e9a26b", glow: "#c2763a", ink: "#fff1e3" },
    tagline: "You found the weight room.",
  }),
  rank({
    id: "plate-mover",
    name: "Plate Mover",
    minLevel: 12,
    letter: "D",
    frame: "shield",
    glyph: "plates",
    colors: { from: "#d9884a", to: "#8a4a1b", rim: "#f2b98a", glow: "#d9884a", ink: "#fff1e3" },
    tagline: "More plates, same smile.",
  }),
  rank({
    id: "rep-machine",
    name: "Rep Machine",
    minLevel: 25,
    letter: "C",
    frame: "shield",
    glyph: "dumbbell",
    colors: { from: "#cbd5e1", to: "#64748b", rim: "#f1f5f9", glow: "#cbd5e1", ink: "#0f172a" },
    tagline: "Reps on repeat.",
  }),
  rank({
    id: "barbell-knight",
    name: "Barbell Knight",
    minLevel: 40,
    letter: "C",
    frame: "winged",
    glyph: "barbell",
    colors: { from: "#e2e8f0", to: "#7c8aa0", rim: "#ffffff", glow: "#e2e8f0", ink: "#0f172a" },
    tagline: "Sworn to the bar.",
  }),
  rank({
    id: "beast-mode",
    name: "Beast Mode",
    minLevel: 60,
    letter: "B",
    frame: "shield",
    glyph: "flame",
    colors: { from: "#fbbf24", to: "#b45309", rim: "#fde68a", glow: "#f59e0b", ink: "#3b1d00" },
    tagline: "The gym fears you a little.",
  }),
  rank({
    id: "iron-titan",
    name: "Iron Titan",
    minLevel: 80,
    letter: "B",
    frame: "winged",
    glyph: "kettlebell",
    colors: { from: "#fcd34d", to: "#a16207", rim: "#fef3c7", glow: "#f59e0b", ink: "#3b1d00" },
    tagline: "Built from the weights you moved.",
  }),
  rank({
    id: "gym-legend",
    name: "Gym Legend",
    minLevel: 100,
    letter: "A",
    frame: "crowned",
    glyph: "crown",
    colors: { from: "#67e8f9", to: "#0e7490", rim: "#cffafe", glow: "#22d3ee", ink: "#04252c" },
    tagline: "Triple digits. Respect.",
  }),
  rank({
    id: "hall-of-famer",
    name: "Hall of Famer",
    minLevel: 150,
    letter: "A",
    frame: "crowned",
    glyph: "trophy",
    colors: { from: "#a5f3fc", to: "#2563eb", rim: "#ecfeff", glow: "#60a5fa", ink: "#06203d" },
    tagline: "Your name is on the wall.",
  }),
  rank({
    id: "mythic-lifter",
    name: "Mythic Lifter",
    minLevel: 250,
    letter: "S",
    frame: "winged",
    glyph: "bolt",
    colors: { from: "#c4b5fd", to: "#6d28d9", rim: "#ede9fe", glow: "#8b5cf6", ink: "#1e0a4a" },
    tagline: "Stories are told about your sets.",
  }),
  rank({
    id: "iron-immortal",
    name: "Iron Immortal",
    minLevel: 400,
    letter: "S",
    frame: "winged",
    glyph: "skull",
    colors: { from: "#fb7185", to: "#9f1239", rim: "#ffe4e6", glow: "#f43f5e", ink: "#2d0610" },
    tagline: "The iron remembers you.",
  }),
  rank({
    id: "titan-of-iron",
    name: "Titan of Iron",
    minLevel: 700,
    letter: "SS",
    frame: "crowned",
    glyph: "star",
    colors: { from: "#fde047", to: "#0891b2", rim: "#fefce8", glow: "#22d3ee", ink: "#06202a" },
    animated: true,
    tagline: "Gold and ice. Few get here.",
  }),
  rank({
    id: "god-of-gains",
    name: "God of Gains",
    minLevel: 1000,
    letter: "SSS",
    frame: "crowned",
    glyph: "infinity",
    colors: { from: "#f0abfc", to: "#22d3ee", rim: "#ffffff", glow: "#e879f9", ink: "#18062a" },
    animated: true,
    tagline: "Level 1000. There is nothing left to prove.",
  }),
];

/** The rank a level belongs to. */
export function rankForLevel(level: number): Rank {
  let current = RANKS[0];
  for (const r of RANKS) if (level >= r.minLevel) current = r;
  return current;
}

/** The next rank above a level, or null at the top. */
export function nextRankAfter(level: number): Rank | null {
  return RANKS.find((r) => r.minLevel > level) ?? null;
}
