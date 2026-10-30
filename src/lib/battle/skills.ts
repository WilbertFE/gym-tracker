/**
 * Skills: abilities your hero unlocks as she levels up. They are passive, because the workout is the only input and nothing
 * can be chosen mid set: a skill switches on by itself in the fight once its level is reached. Each one is a small, bounded
 * bonus, and all of them together stay modest, so a veteran clears gates a little faster and a beginner never feels behind.
 *
 * The level that counts is the one you had on the first day of the week, counted from every source of XP except the gates
 * themselves, so a gate can never unlock the skill that would clear it, and a gate already cleared stays cleared.
 */

export type SkillId = "power-strike" | "iron-will" | "steady-rhythm" | "keen-eye" | "executioner";

export type Skill = {
  id: SkillId;
  name: string;
  /** The level that unlocks it. */
  level: number;
  /** What it does, in a sentence. */
  blurb: string;
};

/** Every fifth set of the week is a Power Strike. */
export const COMBO_EVERY = 5;
export const COMBO_BONUS = 0.25;
/** From the third training day of a week on, every set gets the Steady Rhythm bonus. */
export const RHYTHM_DAYS = 3;
export const RHYTHM_BONUS = 0.1;
/** With Keen Eye a weak point hit deals this much extra instead of the usual 15 percent. */
export const KEEN_EYE_WEAK_BONUS = 0.3;
/** With Executioner a critical hit deals this many times the damage instead of 1.5 times. */
export const EXECUTIONER_CRIT_MULTIPLIER = 2;
/** With Iron Will a monster recovers this share of what it normally would. */
export const IRON_WILL_HEAL_FACTOR = 0.5;

/** In the order they unlock. The first opens with the gates themselves (level 26). */
export const SKILLS: readonly Skill[] = [
  { id: "power-strike", name: "Power Strike", level: 26, blurb: `Every ${COMBO_EVERY}th set of the week deals ${Math.round(COMBO_BONUS * 100)} percent more.` },
  { id: "iron-will", name: "Iron Will", level: 32, blurb: "The monster recovers half as much when you rest." },
  { id: "steady-rhythm", name: "Steady Rhythm", level: 38, blurb: `Once you have trained on ${RHYTHM_DAYS} days of a week, every set deals ${Math.round(RHYTHM_BONUS * 100)} percent more.` },
  { id: "keen-eye", name: "Keen Eye", level: 44, blurb: `A weak point hit deals ${Math.round(KEEN_EYE_WEAK_BONUS * 100)} percent more instead of 15.` },
  { id: "executioner", name: "Executioner", level: 50, blurb: `A critical hit deals ${EXECUTIONER_CRIT_MULTIPLIER} times the damage instead of 1.5.` },
];

/** What the unlocked skills change in a fight. With no skills this is the plain rules. */
export type SkillEffects = {
  /** Power Strike: every fifth set deals extra. */
  combo: boolean;
  /** Iron Will: how much of its normal recovery a monster gets, 1 for all of it. */
  healFactor: number;
  /** Steady Rhythm: sets from the third training day on deal extra. */
  rhythm: boolean;
  /** The extra damage of a weak point hit. */
  weakBonus: number;
  /** How many times the damage a critical hit deals. */
  critMultiplier: number;
};

export const NO_SKILLS: SkillEffects = { combo: false, healFactor: 1, rhythm: false, weakBonus: 0.15, critMultiplier: 1.5 };

/** The skills a level has unlocked. */
export const unlockedSkills = (level: number): Skill[] => SKILLS.filter((s) => level >= s.level);

/** What a level's skills change in the fight. */
export function skillEffects(level: number): SkillEffects {
  const has = (id: SkillId) => unlockedSkills(level).some((s) => s.id === id);
  return {
    combo: has("power-strike"),
    healFactor: has("iron-will") ? IRON_WILL_HEAL_FACTOR : 1,
    rhythm: has("steady-rhythm"),
    weakBonus: has("keen-eye") ? KEEN_EYE_WEAK_BONUS : NO_SKILLS.weakBonus,
    critMultiplier: has("executioner") ? EXECUTIONER_CRIT_MULTIPLIER : NO_SKILLS.critMultiplier,
  };
}
