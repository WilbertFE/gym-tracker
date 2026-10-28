/**
 * The words the app uses when it speaks as "the System": short bracketed notices in capitals, plain and
 * a little cold. They live here so the tone stays the same everywhere and is easy to change in one place.
 */
export const SYSTEM = {
  tag: "SYSTEM",
  levelUp: "LEVEL UP",
  rankUp: "NEW RANK",
  unlocked: "UNLOCKED",
  questComplete: "QUEST COMPLETE",
  questsComplete: "ALL QUESTS COMPLETE",
  questAvailable: "NEW QUEST AVAILABLE",
  continue: "Continue",
} as const;

/** "[SYSTEM] text" */
export const notice = (text: string): string => `[${SYSTEM.tag}] ${text}`;
