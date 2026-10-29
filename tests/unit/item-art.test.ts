import { describe, expect, it, vi } from "vitest";
import { AURA_ART, auraKindFor, gradePips, ITEM_ICONS, mergeLoadout, plateStyleFor, previewChanges } from "@/lib/item-art";
import { GRADE_ORDER, ITEMS, NO_EQUIPMENT, plateByWord } from "@/lib/items";
import { drawShareCard, SHARE_FORMATS, SHARE_TEMPLATES, CHEST_TEMPLATES } from "@/lib/share-render";
import { sampleShareCard } from "@/lib/share-sample";

vi.stubGlobal("Path2D", class {});

describe("item icons and art", () => {
  it("give every item an icon, and no icon for an item that does not exist", () => {
    for (const item of ITEMS) expect(ITEM_ICONS[item.id], item.id).toBeTruthy();
    expect(Object.keys(ITEM_ICONS).sort()).toEqual(ITEMS.map((i) => i.id).sort());
  });

  it("give every aura an art kind, and only auras", () => {
    const auras = ITEMS.filter((i) => i.slot === "aura").map((i) => i.id);
    expect(Object.keys(AURA_ART).sort()).toEqual(auras.sort());
    expect(new Set(Object.values(AURA_ART))).toEqual(new Set(["halo", "ring", "crystals", "sparks", "rays"]));
  });

  it("make the rarer auras the richer ones", () => {
    expect(AURA_ART["aura-gilded"]).toBe("sparks");
    expect(AURA_ART["aura-sovereign"]).toBe("rays");
    expect(auraKindFor("aura-sovereign")).toBe("rays");
    // Something that is not an aura item is a plain halo.
    expect(auraKindFor(null)).toBe("halo");
    expect(auraKindFor("nope")).toBe("halo");
  });

  it("dress a nameplate for its grade, with four looks across the six grades", () => {
    const styles = GRADE_ORDER.map(plateStyleFor);
    expect(styles).toEqual(["plain", "plain", "bracket", "gradient", "crest", "crest"]);
    expect(new Set(styles).size).toBe(4);
  });

  it("count one pip for Common up to six for Mythic", () => {
    expect(GRADE_ORDER.map(gradePips)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("nameplate words", () => {
  const plates = ITEMS.filter((i) => i.slot === "plate");

  it("are unique, so a word names exactly one item", () => {
    expect(new Set(plates.map((p) => p.value)).size).toBe(plates.length);
  });

  it("find their item, and nothing for an unknown or empty word", () => {
    for (const plate of plates) expect(plateByWord(plate.value)?.id).toBe(plate.id);
    expect(plateByWord("Nobody")).toBeNull();
    expect(plateByWord(null)).toBeNull();
    expect(plateByWord("")).toBeNull();
    // A word of an item that is not a plate does not count.
    expect(plateByWord("steel")).toBeNull();
  });
});

describe("trying items on", () => {
  const worn = { ...NO_EQUIPMENT, frame: "frame-steel", aura: "aura-frost" };

  it("lays a preview over what is worn, per slot", () => {
    expect(mergeLoadout(worn, { frame: "frame-apex" })).toEqual({ ...worn, frame: "frame-apex" });
    expect(mergeLoadout(worn, { plate: "plate-rookie" })).toEqual({ ...worn, plate: "plate-rookie" });
  });

  it("previews taking an item off with null, and leaves a missing slot alone", () => {
    expect(mergeLoadout(worn, { aura: null }).aura).toBeNull();
    expect(mergeLoadout(worn, {}).aura).toBe("aura-frost");
    expect(mergeLoadout(worn, { frame: undefined }).frame).toBe("frame-steel");
  });

  it("changes neither argument", () => {
    const preview = { frame: "frame-hex" };
    const before = JSON.stringify([worn, preview]);
    mergeLoadout(worn, preview);
    expect(JSON.stringify([worn, preview])).toBe(before);
  });

  it("says which slots a preview really changes", () => {
    expect(previewChanges(worn, {})).toEqual([]);
    expect(previewChanges(worn, { frame: "frame-steel" })).toEqual([]);
    expect(previewChanges(worn, { frame: "frame-hex", aura: null, plate: "plate-rookie" }).sort()).toEqual(["aura", "frame", "plate"]);
  });
});

describe("the sample share card", () => {
  const ctx = () => {
    const drawn: string[] = [];
    const target: Record<string, unknown> = {
      measureText: (s: string) => ({ width: s.length * 10 }),
      fillText: (s: string) => void drawn.push(s),
      createLinearGradient: () => ({ addColorStop: () => {} }),
    };
    const proxy = new Proxy(target, {
      get: (t, key: string) => (key in t ? t[key] : () => {}),
      set: (t, key: string, value) => ((t[key] = value), true),
    }) as unknown as CanvasRenderingContext2D;
    return { proxy, drawn };
  };

  it("is made up, with no location and no name", () => {
    const card = sampleShareCard();
    expect(card.location).toBeNull();
    expect(JSON.stringify(card)).not.toMatch(/latitude|longitude|email/);
    expect(card.sets).toBeGreaterThan(0);
  });

  it.each([...SHARE_TEMPLATES, ...CHEST_TEMPLATES].flatMap((t) => SHARE_FORMATS.map((f) => [t.value, f.value] as const)))(
    "draws in the %s look, %s size, with the same facts",
    (template, format) => {
      const { proxy, drawn } = ctx();
      const card = sampleShareCard();
      expect(() => drawShareCard(proxy, card, template, format, { sans: "sans-serif", mono: "monospace" })).not.toThrow();
      expect(drawn).toEqual(expect.arrayContaining(["MUSCLES LEVELING", card.title, card.volume]));
    },
  );

  it("never uses an em dash", () => {
    expect(JSON.stringify(sampleShareCard())).not.toContain("—");
  });
});
