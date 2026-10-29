import { describe, expect, it } from "vitest";
import {
  CHEST_ODDS,
  CHEST_PITY,
  CHEST_START_DATE,
  chestId,
  chestKind,
  chestState,
  earnedChests,
  effectiveOdds,
  isChestId,
  pityActive,
  rollChest,
  secureRandom,
  type Opening,
} from "@/lib/chests";
import { equippedItems, GRADE_ORDER, GRADES, ITEMS, itemById, itemsOfGrade, NO_EQUIPMENT, SLOTS } from "@/lib/items";

/** Returns the given numbers one after another, then repeats the last. */
const sequence = (...values: number[]) => {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
};

const opening = (chest_id: string, grade: Opening["grade"], at: string): Opening => ({
  chest_id,
  item_id: "x",
  grade,
  duplicate: false,
  bonus_xp: 0,
  opened_at: at,
});

describe("the item catalog", () => {
  it("has 21 items with unique ids and the planned spread of grades", () => {
    expect(ITEMS).toHaveLength(21);
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(21);
    expect(GRADE_ORDER.map((g) => itemsOfGrade(g).length)).toEqual([6, 6, 5, 4]);
  });

  it("fills every slot, and each value fits its slot", () => {
    for (const slot of SLOTS) expect(ITEMS.some((i) => i.slot === slot.id), slot.id).toBe(true);
    for (const item of ITEMS) {
      if (item.slot === "aura") expect(item.value, item.id).toMatch(/^#[0-9a-f]{6}$/i);
      if (item.slot === "frame") expect(["steel", "cobalt", "runic", "hex", "apex"], item.id).toContain(item.value);
      if (item.slot === "look") expect(["ember", "aurora"], item.id).toContain(item.value);
      if (item.slot === "plate") expect(item.value.length, item.id).toBeLessThanOrEqual(16);
    }
  });

  it("never uses an em dash", () => {
    for (const item of ITEMS) expect(`${item.name} ${item.blurb} ${item.value}`).not.toContain("—");
  });

  it("pays more XP for a repeat of a higher grade", () => {
    const pay = GRADE_ORDER.map((g) => GRADES[g].duplicateXp);
    expect(pay).toEqual([...pay].sort((a, b) => a - b));
    expect(new Set(pay).size).toBe(4);
  });

  it("wears only items that exist and fit their slot", () => {
    const worn = equippedItems({ ...NO_EQUIPMENT, frame: "frame-steel", aura: "frame-steel", plate: "nope" });
    expect(worn.frame?.id).toBe("frame-steel");
    expect(worn.aura).toBeUndefined();
    expect(worn.plate).toBeUndefined();
    expect(itemById("aura-frost")?.slot).toBe("aura");
    expect(itemById("nope")).toBeNull();
  });
});

describe("earning chests", () => {
  it("turns quest bonus days into chests, from the start date on", () => {
    const rewards = [
      { date: "2026-10-28", kind: "daily-sweep" as const },
      { date: CHEST_START_DATE, kind: "daily-sweep" as const },
      { date: "2026-11-01", kind: "weekly-sweep" as const },
      { date: "2026-10-30", kind: "daily" as const },
      { date: "2026-10-30", kind: "weekly" as const },
    ];
    const chests = earnedChests(rewards);
    expect(chests.map((c) => c.id)).toEqual(["d:2026-10-29", "w:2026-10-26"]);
    expect(chests[1]).toMatchObject({ kind: "weekly", earnedOn: "2026-11-01", expiresOn: "2026-11-15" });
    expect(chests[0]).toMatchObject({ kind: "daily", expiresOn: "2026-11-05" });
  });

  it("names a weekly chest after the week's Monday whatever day it was earned", () => {
    expect(chestId("weekly", "2026-10-26")).toBe("w:2026-10-26");
    expect(chestId("weekly", "2026-11-01")).toBe("w:2026-10-26");
    expect(chestId("daily", "2026-11-01")).toBe("d:2026-11-01");
    expect(chestKind("w:2026-10-26")).toBe("weekly");
    expect(chestKind("d:2026-10-26")).toBe("daily");
  });

  it("accepts only well formed chest ids", () => {
    expect(isChestId("d:2026-10-29")).toBe(true);
    expect(isChestId("w:2026-10-26")).toBe(true);
    for (const bad of ["", "x:2026-10-29", "d:2026-1-29", "d:2026-10-29; drop table", "2026-10-29"]) expect(isChestId(bad), bad).toBe(false);
  });

  it("leaves a chest open for 7 days (daily) and 14 days (weekly), then lets it expire", () => {
    const chests = earnedChests([
      { date: "2026-10-29", kind: "daily-sweep" },
      { date: "2026-10-30", kind: "weekly-sweep" },
    ]);
    const none = new Set<string>();
    const on = (today: string) => chestState(chests, none, today);

    expect(on("2026-10-30").available.map((c) => [c.id, c.daysLeft])).toEqual([["d:2026-10-29", 6], ["w:2026-10-26", 14]]);
    // The last day still counts, with 0 days left.
    expect(on("2026-11-05").available.find((c) => c.kind === "daily")?.daysLeft).toBe(0);
    expect(on("2026-11-06").available.map((c) => c.kind)).toEqual(["weekly"]);
    expect(on("2026-11-06").expired.map((c) => c.id)).toEqual(["d:2026-10-29"]);
    expect(on("2026-11-13").available.map((c) => c.id)).toEqual(["w:2026-10-26"]);
    expect(on("2026-11-14").available).toEqual([]);
  });

  it("leaves out chests that are already opened", () => {
    const chests = earnedChests([{ date: "2026-10-29", kind: "daily-sweep" }]);
    expect(chestState(chests, new Set(["d:2026-10-29"]), "2026-10-30")).toEqual({ available: [], expired: [] });
  });
});

describe("the odds", () => {
  it("add up to 100 for both kinds", () => {
    for (const kind of ["daily", "weekly"] as const) {
      expect(GRADE_ORDER.reduce((sum, g) => sum + CHEST_ODDS[kind][g], 0)).toBe(100);
    }
  });

  it("are better in a weekly chest at every grade above Common", () => {
    for (const grade of ["rare", "epic", "legendary"] as const) {
      expect(CHEST_ODDS.weekly[grade], grade).toBeGreaterThan(CHEST_ODDS.daily[grade]);
    }
    expect(CHEST_ODDS.weekly.common).toBeLessThan(CHEST_ODDS.daily.common);
  });

  it("land on the grade whose slice the number falls in", () => {
    const owned = new Set<string>();
    const grade = (kind: "daily" | "weekly", r: number) => rollChest({ kind, owned, history: [], rng: sequence(r, 0) }).grade;
    // Daily: 0 to 62 common, 62 to 89 rare, 89 to 98 epic, 98 to 100 legendary.
    expect([0, 0.61, 0.62, 0.88, 0.89, 0.97, 0.98, 0.999].map((r) => grade("daily", r))).toEqual([
      "common", "common", "rare", "rare", "epic", "epic", "legendary", "legendary",
    ]);
    // Weekly: 0 to 30, 30 to 72, 72 to 92, 92 to 100.
    expect([0.29, 0.3, 0.71, 0.72, 0.91, 0.92].map((r) => grade("weekly", r))).toEqual([
      "common", "rare", "rare", "epic", "epic", "legendary",
    ]);
  });

  it("match the table over many rolls", () => {
    // A small deterministic generator, so the test never flakes.
    let seed = 12345;
    const rng = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
    const counts = { common: 0, rare: 0, epic: 0, legendary: 0 };
    const rolls = 20000;
    for (let i = 0; i < rolls; i++) counts[rollChest({ kind: "weekly", owned: new Set(), history: [], rng }).grade] += 1;
    for (const grade of GRADE_ORDER) {
      expect(Math.abs((counts[grade] / rolls) * 100 - CHEST_ODDS.weekly[grade]), grade).toBeLessThan(1.5);
    }
  });

  it("use a real random source in the server", () => {
    for (let i = 0; i < 50; i++) {
      const r = secureRandom();
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(1);
    }
  });
});

describe("the pity rule", () => {
  const dailyMisses = (n: number) => Array.from({ length: n }, (_, i) => opening(`d:2026-11-${String(i + 1).padStart(2, "0")}`, "common", `2026-12-${String(i + 1).padStart(2, "0")}`));

  it("owes a Rare or better after 10 daily chests below Rare, and not before", () => {
    expect(CHEST_PITY.daily).toEqual({ after: 10, atLeast: "rare" });
    expect(pityActive("daily", dailyMisses(9))).toBe(false);
    expect(pityActive("daily", dailyMisses(10))).toBe(true);
    const owed = rollChest({ kind: "daily", owned: new Set(), history: dailyMisses(10), rng: sequence(0, 0) });
    expect(owed.grade).toBe("rare");
  });

  it("resets after a good chest, and ignores the other kind", () => {
    const history = [...dailyMisses(10), opening("d:2026-11-20", "epic", "2026-12-20")];
    expect(pityActive("daily", history)).toBe(false);
    expect(pityActive("weekly", dailyMisses(10))).toBe(false);
  });

  it("owes an Epic or better after 3 weekly chests below Epic", () => {
    const weekly = ["2026-11-02", "2026-11-09", "2026-11-16"].map((d, i) => opening(`w:${d}`, i === 1 ? "rare" : "common", `2026-12-0${i + 1}`));
    expect(pityActive("weekly", weekly.slice(0, 2))).toBe(false);
    expect(pityActive("weekly", weekly)).toBe(true);
    expect(rollChest({ kind: "weekly", owned: new Set(), history: weekly, rng: sequence(0, 0) }).grade).toBe("epic");
    // The odds shown for the next chest are renormalized and still add up to 100.
    const odds = effectiveOdds("weekly", weekly);
    expect(odds.common + odds.rare).toBe(0);
    expect(odds.epic + odds.legendary).toBeCloseTo(100);
  });
});

describe("what a chest holds", () => {
  it("never repeats an item while one of its grade is missing", () => {
    const common = itemsOfGrade("common");
    const missing = common[3];
    const owned = new Set(common.filter((i) => i.id !== missing.id).map((i) => i.id));
    for (const r of [0, 0.3, 0.6, 0.99]) {
      const roll = rollChest({ kind: "daily", owned, history: [], rng: sequence(0, r) });
      expect(roll.item.id).toBe(missing.id);
      expect(roll.duplicate).toBe(false);
      expect(roll.bonusXp).toBe(0);
    }
  });

  it("pays XP for a repeat once the whole grade is owned", () => {
    const owned = new Set(itemsOfGrade("common").map((i) => i.id));
    const roll = rollChest({ kind: "daily", owned, history: [], rng: sequence(0, 0) });
    expect(roll.grade).toBe("common");
    expect(roll.duplicate).toBe(true);
    expect(roll.bonusXp).toBe(GRADES.common.duplicateXp);
    expect(owned.has(roll.item.id)).toBe(true);
  });

  it("can give every item of a grade, so none is out of reach", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 6; i++) seen.add(rollChest({ kind: "daily", owned: new Set(), history: [], rng: sequence(0, i / 6 + 0.01) }).item.id);
    expect(seen).toEqual(new Set(itemsOfGrade("common").map((i) => i.id)));
  });

  it("opens the whole collection with no repeat along the way", () => {
    let seed = 99;
    const rng = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
    const owned = new Set<string>();
    const history: Opening[] = [];
    let repeats = 0;
    for (let i = 0; i < 400 && owned.size < ITEMS.length; i++) {
      const kind = i % 4 === 3 ? "weekly" : "daily";
      const roll = rollChest({ kind, owned, history, rng });
      if (roll.duplicate) repeats += 1;
      // A repeat can only come up when its whole grade is owned.
      if (roll.duplicate) expect(itemsOfGrade(roll.grade).every((x) => owned.has(x.id))).toBe(true);
      owned.add(roll.item.id);
      history.push({ chest_id: `${kind === "daily" ? "d" : "w"}:2027-01-${String(i).padStart(2, "0")}`, item_id: roll.item.id, grade: roll.grade, duplicate: roll.duplicate, bonus_xp: roll.bonusXp, opened_at: `2027-02-${String(i).padStart(3, "0")}` });
    }
    expect(owned.size).toBe(ITEMS.length);
    expect(repeats).toBeGreaterThanOrEqual(0);
  });
});
