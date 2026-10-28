import { describe, expect, it } from "vitest";
import { nextRankAfter, RANKS, rankForLevel } from "@/lib/ranks";

describe("rank ladder", () => {
  it("starts at level 1 and only goes up", () => {
    expect(RANKS[0].minLevel).toBe(1);
    for (let i = 1; i < RANKS.length; i++) expect(RANKS[i].minLevel).toBeGreaterThan(RANKS[i - 1].minLevel);
  });

  it("has unique ids and names, and no em dash anywhere", () => {
    expect(new Set(RANKS.map((r) => r.id)).size).toBe(RANKS.length);
    expect(new Set(RANKS.map((r) => r.name)).size).toBe(RANKS.length);
    for (const r of RANKS) expect(`${r.name} ${r.tagline}`).not.toContain("\u2014");
  });

  it("gives every rank usable colors", () => {
    for (const r of RANKS) {
      for (const c of Object.values(r.colors)) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("finds the rank for a level at and around each boundary", () => {
    for (let i = 0; i < RANKS.length; i++) {
      expect(rankForLevel(RANKS[i].minLevel).id).toBe(RANKS[i].id);
      if (i > 0) expect(rankForLevel(RANKS[i].minLevel - 1).id).toBe(RANKS[i - 1].id);
    }
    expect(rankForLevel(1).name).toBe("Warm-Up");
    expect(rankForLevel(100).name).toBe("Gym Legend");
    expect(rankForLevel(99999).name).toBe("God of Gains");
  });

  it("finds the next rank, and none at the top", () => {
    expect(nextRankAfter(1)?.name).toBe("Iron Rookie");
    expect(nextRankAfter(5)?.name).toBe("Plate Mover");
    expect(nextRankAfter(999)?.name).toBe("God of Gains");
    expect(nextRankAfter(1000)).toBeNull();
  });

  it("only the top ranks animate", () => {
    expect(RANKS.filter((r) => r.animated).map((r) => r.name)).toEqual(["Titan of Iron", "God of Gains"]);
  });
});
