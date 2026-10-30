import type { GateLetter } from "@/lib/gates";

/**
 * The monsters that guard the gates, one for every rank. A move is what the monster does between your sets: it is shown as
 * a telegraphed strike, takes a share of your stamina and never ends the fight, because the fight cannot be lost. A harder
 * gate has a monster that hits harder, and a monster's strikes grow with its rank.
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
  {
    id: "rep-wraith",
    name: "Rep Wraith",
    rank: "D",
    blurb: "A hooded shade that feeds on skipped reps. It is quick, and it is only ever as strong as your excuses.",
    moves: [
      { name: "Cold Touch", power: 0.07, line: "drags a cold hand across you" },
      { name: "Wail", power: 0.09, line: "wails, and your arms go heavy" },
      { name: "Fade and Strike", power: 0.08, line: "fades out and strikes from behind" },
    ],
  },
  {
    id: "plate-titan",
    name: "Plate Titan",
    rank: "C",
    blurb: "A giant in stacked iron plates with a hammer to match. It hits like a loaded bar.",
    moves: [
      { name: "Hammer Drop", power: 0.1, line: "brings its hammer down" },
      { name: "Plate Wall", power: 0.07, line: "slams a wall of plates into you" },
      { name: "Shockwave", power: 0.09, line: "stamps and sends a shockwave through the floor" },
    ],
  },
  {
    id: "barbell-hydra",
    name: "Barbell Hydra",
    rank: "B",
    blurb: "Three necks, three heads, and none of them are tired. Cut one down and the others keep coming.",
    moves: [
      { name: "Triple Bite", power: 0.11, line: "snaps with all three heads" },
      { name: "Tail Sweep", power: 0.09, line: "sweeps its tail across your legs" },
      { name: "Venom Spit", power: 0.1, line: "spits venom that stings" },
    ],
  },
  {
    id: "lactic-drake",
    name: "Lactic Drake",
    rank: "A",
    blurb: "A drake that burns like the last set of a hard day. Its fire never stops, so neither should you.",
    moves: [
      { name: "Flame Burst", power: 0.13, line: "breathes a burst of flame" },
      { name: "Wing Buffet", power: 0.1, line: "beats its wings and knocks you back" },
      { name: "Claw Rend", power: 0.12, line: "rakes you with its claws" },
    ],
  },
  {
    id: "deadlift-colossus",
    name: "Deadlift Colossus",
    rank: "S",
    blurb: "A black stone giant that carries a barbell like a toothpick. It is the heaviest thing in the System.",
    moves: [
      { name: "Colossal Lift", power: 0.15, line: "hoists its bar and swings it over" },
      { name: "Ground Crush", power: 0.14, line: "crushes the ground under your feet" },
      { name: "Rune Pulse", power: 0.12, line: "pulses with gold light that burns" },
    ],
  },
];

/** A monster by its id. */
export const monsterById = (id: string): Monster | null => MONSTERS.find((m) => m.id === id) ?? null;

/**
 * The season boss's version of a monster: the same creature, awakened, with a name to match and strikes half as hard
 * again. It keeps its id, so it keeps its art, which is drawn with a golden crown of light when it is awakened.
 */
export const awakened = (monster: Monster): Monster => ({
  ...monster,
  name: `Awakened ${monster.name}`,
  blurb: `${monster.blurb} This one has woken for the whole season, and it is stronger than any gate.`,
  moves: monster.moves.map((m) => ({ ...m, power: Math.round(m.power * 1.5 * 100) / 100 })),
});

/** The monster of a gate rank. Every rank has one. */
export const monsterFor = (letter: GateLetter): Monster | null => MONSTERS.find((m) => m.rank === letter) ?? null;
