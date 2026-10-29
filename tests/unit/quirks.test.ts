import { describe, expect, it } from "vitest";
import { mayQuirk, pickQuirk, POKE_WINDOW_MS, POKES_TO_ANNOY, QUIRK_GAP_MS, quirkGap, registerPoke } from "@/lib/mascot/quirks";
import { QUIRKS } from "@/lib/mascot/types";

describe("her little behaviours", () => {
  it("picks a quirk from the list, never the one she just did", () => {
    for (const last of QUIRKS) {
      for (const r of [0, 0.25, 0.5, 0.75, 0.999999]) {
        const q = pickQuirk(() => r, last);
        expect(QUIRKS).toContain(q);
        expect(q).not.toBe(last);
      }
    }
  });

  it("reaches every quirk over time", () => {
    const seen = new Set<string>();
    let last = null as (typeof QUIRKS)[number] | null;
    for (let i = 0; i < 200; i++) {
      last = pickQuirk(() => (i * 0.6180339887) % 1, last);
      seen.add(last);
    }
    expect(seen.size).toBe(QUIRKS.length);
  });

  it("waits between 15 and 35 seconds for the next one", () => {
    expect(quirkGap(() => 0)).toBe(QUIRK_GAP_MS.min);
    expect(quirkGap(() => 1)).toBe(QUIRK_GAP_MS.max);
    expect(QUIRK_GAP_MS.min).toBeGreaterThanOrEqual(15_000);
    expect(QUIRK_GAP_MS.max).toBeLessThanOrEqual(35_000);
    for (const r of [0.1, 0.5, 0.9]) {
      const gap = quirkGap(() => r);
      expect(gap).toBeGreaterThanOrEqual(QUIRK_GAP_MS.min);
      expect(gap).toBeLessThanOrEqual(QUIRK_GAP_MS.max);
    }
  });

  it("only does one while she is idle: not while talking, not with reduced motion, not while busy", () => {
    expect(mayQuirk({ talking: false, reducedMotion: false, busy: false })).toBe(true);
    expect(mayQuirk({ talking: true, reducedMotion: false, busy: false })).toBe(false);
    expect(mayQuirk({ talking: false, reducedMotion: true, busy: false })).toBe(false);
    expect(mayQuirk({ talking: false, reducedMotion: false, busy: true })).toBe(false);
  });
});

describe("poking her", () => {
  it("annoys her on the fifth fast tap, and starts over", () => {
    let taps: number[] = [];
    let annoyed = false;
    for (let i = 0; i < POKES_TO_ANNOY; i++) {
      const r = registerPoke(taps, 1000 + i * 300);
      taps = r.taps;
      annoyed = r.annoyed;
      if (i < POKES_TO_ANNOY - 1) expect(annoyed).toBe(false);
    }
    expect(annoyed).toBe(true);
    expect(taps).toEqual([]);
  });

  it("forgets slow taps", () => {
    let taps: number[] = [];
    for (let i = 0; i < 10; i++) {
      const r = registerPoke(taps, i * (POKE_WINDOW_MS + 100));
      taps = r.taps;
      expect(r.annoyed).toBe(false);
    }
    expect(taps.length).toBe(1);
  });
});
