import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MonsterArt } from "@/components/battle/monster-art";
import { woundCount } from "@/components/battle/monster-shared";
import { MONSTERS } from "@/lib/battle/monsters";

describe("the monsters' art", () => {
  it("draws a different monster for every id, each in the shared frame with a body group", () => {
    const drawings = MONSTERS.map((m) => renderToStaticMarkup(<MonsterArt monster={m.id} />));
    expect(new Set(drawings).size).toBe(MONSTERS.length);
    for (const svg of drawings) {
      expect(svg).toContain('viewBox="0 0 240 260"');
      expect(svg).toContain("battle-monster-body");
      expect(svg).toContain('aria-hidden="true"');
      expect(svg).not.toContain("—");
    }
  });

  it("draws the Iron Golem for an id it does not know, and sizes every monster by width", () => {
    expect(renderToStaticMarkup(<MonsterArt monster="nope" />)).toBe(renderToStaticMarkup(<MonsterArt monster="iron-golem" />));
    for (const m of MONSTERS) expect(renderToStaticMarkup(<MonsterArt monster={m.id} size={120} />)).toContain('width="120"');
  });

  it("carries its state to the CSS that moves it", () => {
    for (const state of ["idle", "hit", "strike", "down"] as const) {
      for (const m of MONSTERS) expect(renderToStaticMarkup(<MonsterArt monster={m.id} state={state} />)).toContain(`data-state="${state}"`);
    }
  });

  it("shows more marks of damage as it loses HP, and all of them when it falls", () => {
    expect([1, 0.7, 0.4, 0.2].map((hp) => woundCount(hp, false))).toEqual([0, 1, 2, 3]);
    expect(woundCount(0.9, true)).toBe(3);
    for (const m of MONSTERS) {
      const fresh = renderToStaticMarkup(<MonsterArt monster={m.id} hp={1} />);
      const hurt = renderToStaticMarkup(<MonsterArt monster={m.id} hp={0.2} />);
      expect(hurt.length, m.id).toBeGreaterThan(fresh.length);
    }
  });
});
