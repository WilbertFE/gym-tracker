import { describe, expect, it } from "vitest";
import {
  BIO_MAX,
  buildSnapshot,
  DEFAULT_SECTIONS,
  NEVER_SHARED,
  parseSections,
  RESERVED_USERNAMES,
  SECTIONS,
  toPublicProfile,
  validateBio,
  validateUsername,
  type Profile,
} from "@/lib/profile";
import { NO_EQUIPMENT } from "@/lib/items";
import { muscleLevels } from "@/lib/muscle-levels";

describe("usernames", () => {
  it("accept lowercase letters, digits and underscores, and fold case", () => {
    expect(validateUsername("Iron_Wil")).toEqual({ ok: true, username: "iron_wil" });
    expect(validateUsername("  @lifter99 ")).toEqual({ ok: true, username: "lifter99" });
    expect(validateUsername("abc")).toEqual({ ok: true, username: "abc" });
    expect(validateUsername("a".repeat(20))).toMatchObject({ ok: true });
  });

  it("refuse the wrong length, characters and shapes", () => {
    expect(validateUsername("ab")).toMatchObject({ ok: false });
    expect(validateUsername("a".repeat(21))).toMatchObject({ ok: false });
    for (const bad of ["has space", "dot.name", "dash-name", "emoji😀", "ünïcode", "a/b", "../x", "<b>x</b>", "_lead", "12345", "___", ""]) {
      expect(validateUsername(bad), bad).toMatchObject({ ok: false });
    }
    expect(validateUsername(42)).toMatchObject({ ok: false });
    expect(validateUsername(null)).toMatchObject({ ok: false });
  });

  it("keep routes and official looking names for the app", () => {
    for (const name of ["admin", "Admin", "settings", "api", "u", "leaderboard", "system"]) {
      expect(validateUsername(name), name).toMatchObject({ ok: false });
    }
    expect(RESERVED_USERNAMES).toContain("collection");
  });
});

describe("bios", () => {
  it("are one line of plain text, or none", () => {
    expect(validateBio(null)).toEqual({ ok: true, bio: null });
    expect(validateBio("   ")).toEqual({ ok: true, bio: null });
    expect(validateBio("Leg day\nevery day\t!")).toEqual({ ok: true, bio: "Leg day every day !" });
    expect(validateBio("bell\u0007ring")).toEqual({ ok: true, bio: "bellring" });
  });

  it("stop at the limit and refuse non text", () => {
    expect(validateBio("x".repeat(BIO_MAX))).toMatchObject({ ok: true });
    expect(validateBio("x".repeat(BIO_MAX + 1))).toMatchObject({ ok: false });
    expect(validateBio(5)).toMatchObject({ ok: false });
  });

  it("keep markup as plain text, which the page escapes", () => {
    expect(validateBio("<script>alert(1)</script>")).toEqual({ ok: true, bio: "<script>alert(1)</script>" });
  });
});

describe("the sections", () => {
  it("are six, with unique ids and no em dash", () => {
    expect(SECTIONS).toHaveLength(6);
    expect(new Set(SECTIONS.map((s) => s.id)).size).toBe(6);
    for (const s of SECTIONS) expect(`${s.name} ${s.hint}`).not.toContain("—");
    for (const line of NEVER_SHARED) expect(line).not.toContain("—");
  });

  it("read anything missing or wrong as the default", () => {
    expect(parseSections(null)).toEqual(DEFAULT_SECTIONS);
    expect(parseSections({ stats: false })).toEqual({ ...DEFAULT_SECTIONS, stats: false });
    expect(parseSections({ stats: "no", level: 0, bogus: true })).toEqual(DEFAULT_SECTIONS);
    expect(Object.keys(parseSections({ bogus: true })).sort()).toEqual(SECTIONS.map((s) => s.id).sort());
  });
});

const snapshot = () =>
  buildSnapshot({
    levelNumber: 16,
    xp: 301,
    title: "First Steps",
    stats: [
      { name: "Strength", value: 16 },
      { name: "Endurance", value: 23 },
    ],
    titles: [
      { id: "firststeps", earned: true },
      { id: "regular", earned: false },
    ],
    owned: ["frame-steel", "aura-frost", "plate-rookie", "not-an-item"],
    equipment: { ...NO_EQUIPMENT, frame: "frame-steel", aura: "aura-gilded", plate: "plate-rookie" },
    muscles: muscleLevels([{ exercise_id: "a" }, { exercise_id: "a" }], [{ id: "a", primary_muscle: "chest" as never, secondary_muscles: [] }]),
    activity: { workouts: 9, longestStreak: 4, questsCompleted: 12, gatesCleared: 1, volumeKg: 20_400 },
    firstDate: "2026-10-01",
  });

const profile = (over: Partial<Pick<Profile, "visibility" | "sections">> = {}) => ({
  username: "iron_wil",
  display_name: "Iron Wil",
  bio: "Leg day",
  visibility: "members" as const,
  sections: { ...DEFAULT_SECTIONS },
  snapshot: snapshot(),
  ...over,
});

describe("what a viewer may see", () => {
  it("is nothing of a private profile, unless the viewer is the owner", () => {
    expect(toPublicProfile(profile({ visibility: "private" }), false)).toBeNull();
    expect(toPublicProfile(profile({ visibility: "private" }), true)).not.toBeNull();
  });

  it("is every shared section of a visible profile", () => {
    const view = toPublicProfile(profile(), false)!;
    expect(view).toMatchObject({ username: "iron_wil", displayName: "Iron Wil", bio: "Leg day", isOwner: false });
    expect(view.level).toMatchObject({ level: 16, xp: 301, title: "First Steps" });
    expect(view.level?.rank.name).toBeTruthy();
    expect(view.stats).toHaveLength(2);
    expect(view.titles).toEqual(["firststeps"]);
    expect(view.muscles).toHaveLength(16);
    expect(view.activity).toMatchObject({ workouts: 9, longestStreak: 4, firstDate: "2026-10-01" });
  });

  it("leaves a switched off section out completely, so it is never sent", () => {
    const sections = { ...DEFAULT_SECTIONS, stats: false, activity: false, collection: false };
    const view = toPublicProfile(profile({ sections }), false)!;
    expect(view.stats).toBeNull();
    expect(view.activity).toBeNull();
    expect(view.collection).toBeNull();
    expect(view.level).not.toBeNull();
    const text = JSON.stringify(view);
    expect(text).not.toContain("20400");
    expect(text).not.toContain("Strength");
    expect(text).not.toContain("frame-steel");
  });

  it("can hide everything but the names", () => {
    const sections = Object.fromEntries(SECTIONS.map((s) => [s.id, false])) as typeof DEFAULT_SECTIONS;
    const view = toPublicProfile(profile({ sections }), false)!;
    expect([view.level, view.stats, view.collection, view.titles, view.muscles, view.activity]).toEqual([null, null, null, null, null, null]);
    expect(view.displayName).toBe("Iron Wil");
  });

  it("shows the owner every section, and says which others can see", () => {
    const sections = { ...DEFAULT_SECTIONS, stats: false };
    const view = toPublicProfile(profile({ sections }), true)!;
    expect(view.stats).not.toBeNull();
    expect(view.shared.stats).toBe(false);
    expect(view.isOwner).toBe(true);
  });

  it("only shows worn items that are owned, exist and fit their slot", () => {
    const view = toPublicProfile(profile(), false)!;
    expect(view.collection?.worn.frame?.id).toBe("frame-steel");
    expect(view.collection?.worn.plate?.id).toBe("plate-rookie");
    // The aura worn in the snapshot is not owned, so it does not show.
    expect(view.collection?.worn.aura).toBeUndefined();
    // An id that is not an item is dropped from the owned list.
    expect(view.collection?.owned.map((i) => i.id)).toEqual(["frame-steel", "aura-frost", "plate-rookie"]);
  });

  it("copes with a profile that has no snapshot yet", () => {
    const view = toPublicProfile(profile({}) && { ...profile(), snapshot: null }, false)!;
    expect(view.level).toBeNull();
    expect(view.collection).toBeNull();
    expect(view.updatedAt).toBeNull();
    expect(view.displayName).toBe("Iron Wil");
  });

  it("never carries private data, only what was put in the snapshot", () => {
    const text = JSON.stringify(snapshot());
    // Field names, not words: a muscle's "weighted" sets are training volume, not body weight.
    for (const field of ["weight", "weight_kg", "photo", "photos", "latitude", "longitude", "email", "gym_name", "location", "mood", "energy", "sleep_hours"]) {
      expect(text, field).not.toContain(`"${field}":`);
    }
  });
});
