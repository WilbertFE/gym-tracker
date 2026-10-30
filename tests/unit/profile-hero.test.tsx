import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { equipmentOf, ProfileHeader } from "@/app/(app)/u/[username]/components/profile-header";
import { NO_EQUIPMENT } from "@/lib/items";
import { buildSnapshot, DEFAULT_SECTIONS, toPublicProfile } from "@/lib/profile";
import { muscleLevels } from "@/lib/muscle-levels";

const OWNED = ["frame-steel", "aura-gilded", "plate-rookie", "weapon-voidreaver", "outfit-eclipse"];

const snapshot = () =>
  buildSnapshot({
    levelNumber: 30,
    xp: 700,
    title: null,
    stats: [{ name: "Strength", value: 16 }],
    titles: [],
    owned: OWNED,
    equipment: { ...NO_EQUIPMENT, frame: "frame-steel", aura: "aura-gilded", plate: "plate-rookie", weapon: "weapon-voidreaver", outfit: "outfit-eclipse" },
    muscles: muscleLevels([], []),
    activity: { workouts: 1, longestStreak: 1, questsCompleted: 0, gatesCleared: 0, volumeKg: 10 },
    firstDate: "2026-10-01",
  });

const view = (sections: Partial<typeof DEFAULT_SECTIONS> = {}, owner = false) =>
  toPublicProfile(
    {
      username: "iron_wil",
      display_name: "Iron Wil",
      bio: null,
      visibility: "members",
      sections: { ...DEFAULT_SECTIONS, level: true, collection: true, ...sections },
      snapshot: snapshot(),
    },
    owner,
  )!;

const html = (v: ReturnType<typeof view>) => renderToStaticMarkup(<ProfileHeader view={v} />);

describe("the character on a profile", () => {
  it("is drawn in the header, with one h1 and the name", () => {
    const out = html(view());
    expect(out).toContain('data-testid="profile-hero"');
    expect(out).toContain("battle-hero");
    expect(out.match(/<h1/g)).toHaveLength(1);
    expect(out).toContain("Iron Wil");
  });

  it("wears what the player wears when the collection is shared, and says so in text", () => {
    const out = html(view());
    expect(out).toContain("wearing");
    for (const name of ["Voidreaver", "Eclipse Mantle", "Steel"]) expect(out).toContain(name);
    // The blade and the jacket of the Mythic items reach the figure.
    expect(out).toContain("#ff4d5e");
  });

  it("wears nothing and names nothing when the collection is private", () => {
    const shared = html(view());
    const hidden = html(view({ collection: false }));
    expect(hidden).toContain('data-testid="profile-hero"');
    expect(hidden).not.toContain("wearing");
    for (const name of ["Voidreaver", "Eclipse Mantle"]) expect(hidden).not.toContain(name);
    expect(hidden).not.toContain("#ff4d5e");
    expect(hidden).not.toBe(shared);
  });

  it("has no rank badge when the level is private, and still has a character", () => {
    const withBadge = html(view());
    const without = html(view({ level: false }));
    expect(without).toContain('data-testid="profile-hero"');
    expect(without).not.toContain("XP in total");
    expect(without).not.toContain("Level");
    expect(without.length).toBeLessThan(withBadge.length);
  });

  it("shows the owner everything, whatever the sections say", () => {
    const out = html(view({ collection: false, level: false }, true));
    expect(out).toContain("Voidreaver");
    expect(out).toContain("XP in total");
  });
});

describe("equipmentOf", () => {
  it("is nothing worn for nothing, and an id for each worn item", () => {
    expect(equipmentOf(undefined)).toEqual(NO_EQUIPMENT);
    expect(equipmentOf({})).toEqual(NO_EQUIPMENT);
    const worn = view().collection!.worn;
    expect(equipmentOf(worn)).toMatchObject({ weapon: "weapon-voidreaver", outfit: "outfit-eclipse", aura: "aura-gilded", frame: "frame-steel" });
  });
});
