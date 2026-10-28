import { describe, expect, it } from "vitest";
import { rankForLevel } from "@/lib/ranks";
import { notice, SYSTEM } from "@/lib/system-voice";
import { BIG_LEVEL_JUMP, diffXp, isBigMoment, type XpSnapshot } from "@/lib/xp-diff";
import { levelForXp, xpForLevel } from "@/lib/xp";

const snap = (total: number): XpSnapshot => {
  const l = levelForXp(total);
  return { userId: "u", total, level: l.level, progress: l.progress, rank: l.rank, lines: [{ source: "gym", label: "Gym", xp: total }] };
};

describe("the System's voice", () => {
  it("speaks in short capitals, with no em dash", () => {
    for (const text of Object.values(SYSTEM)) expect(text).not.toContain("—");
    expect(SYSTEM.levelUp).toBe(SYSTEM.levelUp.toUpperCase());
    expect(SYSTEM.questComplete).toBe(SYSTEM.questComplete.toUpperCase());
  });

  it("brackets a notice", () => {
    expect(notice("Quests unlocked")).toBe("[SYSTEM] Quests unlocked");
  });
});

describe("when a gain gets the full screen", () => {
  it("is not for a small gain", () => {
    const gain = diffXp(snap(100), snap(110))!;
    expect(isBigMoment(gain, 0)).toBe(false);
  });

  it("is not for one level, or two", () => {
    // Levels 16 to 18 cross no rank, so only the number of levels counts.
    expect(isBigMoment(diffXp(snap(xpForLevel(16) - 1), snap(xpForLevel(17)))!, 0)).toBe(false);
    expect(isBigMoment(diffXp(snap(xpForLevel(16)), snap(xpForLevel(18)))!, 0)).toBe(false);
  });

  it("is for several levels at once", () => {
    const gain = diffXp(snap(xpForLevel(16)), snap(xpForLevel(16 + BIG_LEVEL_JUMP)))!;
    expect(isBigMoment(gain, 0)).toBe(true);
  });

  it("is for a new rank, even one level up", () => {
    const gain = diffXp(snap(xpForLevel(5) - 2), snap(xpForLevel(5)))!;
    expect(gain.rankedUp).toBe(true);
    expect(rankForLevel(gain.to.level).name).toBe("Iron Rookie");
    expect(isBigMoment(gain, 0)).toBe(true);
  });

  it("is for an unlock, even one level up", () => {
    const gain = diffXp(snap(xpForLevel(8) - 2), snap(xpForLevel(8)))!;
    expect(gain.rankedUp).toBe(false);
    expect(isBigMoment(gain, 1)).toBe(true);
    expect(isBigMoment(gain, 0)).toBe(false);
  });
});
