import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HeroArt, HeroFigure, OUTFIT_IDS } from "@/components/battle/hero-art";
import { ItemArt } from "@/components/items/item-art";
import { ITEM_ICONS } from "@/lib/item-art";
import { itemsOfSlot, ITEMS, NO_EQUIPMENT, SLOTS } from "@/lib/items";
import { resetRateLimits } from "@/lib/rate-limit";
import { resetStores } from "@/lib/repositories/memory/store";
import { RANKS } from "@/lib/ranks";

vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");

import { PUT as putEquipment } from "@/app/api/equipment/route";

const put = (body: unknown) => putEquipment(new Request("http://localhost/api/equipment", { method: "PUT", body: JSON.stringify(body) }));

beforeEach(() => {
  resetStores();
  resetRateLimits();
});

describe("the weapon and outfit slots", () => {
  it("are slots like the others, each with items of several grades", () => {
    expect(SLOTS.map((s) => s.id)).toEqual(["frame", "aura", "plate", "look", "weapon", "outfit"]);
    expect(Object.keys(NO_EQUIPMENT).sort()).toEqual(SLOTS.map((s) => s.id).sort());
    for (const slot of ["weapon", "outfit"] as const) {
      const items = itemsOfSlot(slot);
      expect(items.length, slot).toBeGreaterThanOrEqual(5);
      expect(new Set(items.map((i) => i.grade)).size, slot).toBeGreaterThanOrEqual(4);
    }
  });

  it("have a color for every weapon and a palette for every outfit, and an icon each", () => {
    for (const weapon of itemsOfSlot("weapon")) expect(weapon.value, weapon.id).toMatch(/^#[0-9a-f]{6}$/i);
    for (const outfit of itemsOfSlot("outfit")) expect(OUTFIT_IDS, outfit.id).toContain(outfit.value);
    for (const item of ITEMS) expect(ITEM_ICONS[item.id], item.id).toBeDefined();
  });
});

describe("the hero in her gear", () => {
  it("draws the blade in the color of the weapon and the jacket in the colors of the outfit", () => {
    const plain = renderToStaticMarkup(<HeroArt />);
    const armed = renderToStaticMarkup(<HeroArt blade="#ff8a3d" />);
    const dressed = renderToStaticMarkup(<HeroArt outfit="crimson" />);
    expect(plain).not.toContain("#ff8a3d");
    expect(armed).toContain("#ff8a3d");
    expect(dressed).toContain("#45151f");
    expect(dressed).not.toBe(plain);
    // An unknown outfit falls back to the System jacket.
    expect(renderToStaticMarkup(<HeroArt outfit="nope" />)).toBe(plain);
  });

  it("wears what is equipped, and shows the item art of a weapon or an outfit on her", () => {
    const worn = renderToStaticMarkup(<HeroFigure rank={RANKS[3]} equipment={{ ...NO_EQUIPMENT, weapon: "weapon-violet", outfit: "outfit-gilded" }} />);
    expect(worn).toContain("#b07cff");
    expect(worn).toContain("#4a3c18");
    const weapon = itemsOfSlot("weapon")[0];
    const outfit = itemsOfSlot("outfit")[0];
    expect(renderToStaticMarkup(<ItemArt item={weapon} rank={RANKS[3]} />)).toContain("<svg");
    expect(renderToStaticMarkup(<ItemArt item={outfit} rank={RANKS[3]} />)).toContain("<svg");
  });
});

describe("PUT /api/equipment for the new slots", () => {
  it("refuses a weapon that is not owned and an unknown slot", async () => {
    expect((await put({ slot: "weapon", itemId: "weapon-steel" })).status).toBeGreaterThanOrEqual(400);
    expect((await put({ slot: "cape", itemId: "x" })).status).toBe(400);
  });
});
