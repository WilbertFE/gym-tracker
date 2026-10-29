import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AVAILABLE, FACE_CROPS, SPRITE_IDS, spriteFor, spriteSrc, wantedSprite } from "@/lib/mascot/sprites";
import { MOODS, POSES, QUIRKS } from "@/lib/mascot/types";

describe("which sprite she shows", () => {
  it("has a picture file for every sprite listed as available", () => {
    for (const id of AVAILABLE) {
      expect(existsSync(join(process.cwd(), "public", spriteSrc(id))), id).toBe(true);
    }
  });

  it("only lists real sprite ids, and always has calm", () => {
    for (const id of AVAILABLE) expect(SPRITE_IDS).toContain(id);
    expect(AVAILABLE).toContain("calm");
  });

  it("resolves every mood, pose and quirk to a sprite that has a picture", () => {
    for (const mood of MOODS) {
      for (const pose of POSES) {
        expect(AVAILABLE, `${mood} ${pose}`).toContain(spriteFor(mood, pose));
        for (const quirk of QUIRKS) expect(AVAILABLE, `${mood} ${pose} ${quirk}`).toContain(spriteFor(mood, pose, quirk));
      }
    }
  });

  it("lets a quirk win, then a pose, then the mood", () => {
    expect(wantedSprite("calm", "idle", "tongue")).toBe("taunt");
    expect(wantedSprite("calm", "wave", "tongue")).toBe("taunt");
    expect(wantedSprite("calm", "cheer", null)).toBe("cheer");
    expect(wantedSprite("smug", "idle", null)).toBe("smug");
    expect(wantedSprite("flustered", "idle", null)).toBe("flustered");
    expect(wantedSprite("calm", "crossed", null)).toBe("annoyed");
  });

  it("falls back to the nearest picture while a sprite has none, and never to nothing", () => {
    for (const id of SPRITE_IDS) {
      if (AVAILABLE.includes(id)) continue;
      expect(AVAILABLE).toContain(spriteFor(id === "sleepy" ? "sleepy" : "calm", "idle", id === "taunt" ? "tongue" : null));
    }
    // A sprite that has a picture is never swapped for another.
    for (const id of AVAILABLE) expect(spriteFor(id === "smug" ? "smug" : id === "calm" ? "calm" : id === "happy" ? "happy" : id === "cheer" ? "cheer" : "thinking")).toBe(id);
  });

  it("has a face crop for every sprite that fits inside the picture", () => {
    for (const id of SPRITE_IDS) {
      const c = FACE_CROPS[id];
      expect(c.x, id).toBeGreaterThanOrEqual(0);
      expect(c.y, id).toBeGreaterThanOrEqual(0);
      expect(c.x + c.w, id).toBeLessThanOrEqual(1);
      // A square crop that is `w` wide is two thirds of `w` tall, because the picture is 2:3.
      expect(c.y + c.w * (2 / 3), id).toBeLessThanOrEqual(1);
    }
  });
});
