import type { GateLetter } from "@/lib/gates";

/**
 * The monsters that guard the gates. Only the E gate has one so far (the Iron Golem); the other ranks keep their
 * plain boss card until their monster is made. A move is what the monster does between your sets: it is shown as a
 * telegraphed strike, takes a share of your stamina and never ends the fight, because the fight cannot be lost.
 */
export type MonsterMove = {
  name: string;
  /** What the strike takes at most, as a share of the hero's full stamina, before the hero blocks some of it. */
  power: number;
  /** One line for the log. */
  line: string;
};

export type Monster = {
  id: string;
  name: string;
  rank: GateLetter;
  /** One line about it. */
  blurb: string;
  moves: readonly MonsterMove[];
};

export const MONSTERS: readonly Monster[] = [
  {
    id: "iron-golem",
    name: "Iron Golem",
    rank: "E",
    blurb: "A slow wall of old plates and rust. It does not tire, so you will have to outlast it.",
    moves: [
      { name: "Stone Fist", power: 0.06, line: "swings a stone fist" },
      { name: "Rubble Slam", power: 0.08, line: "slams the ground and throws rubble" },
      { name: "Rust Breath", power: 0.05, line: "breathes a cloud of rust" },
    ],
  },
];

/** The monster of a gate rank, or null while that rank has none. */
export const monsterFor = (letter: GateLetter): Monster | null => MONSTERS.find((m) => m.rank === letter) ?? null;
