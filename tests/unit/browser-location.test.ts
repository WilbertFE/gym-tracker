import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BEST_FIX_WINDOW_MS, getBestPosition, GOOD_ENOUGH_METERS } from "@/lib/browser-location";

type Reading = { latitude: number; longitude: number; accuracy: number };
type Handlers = { ok: (pos: { coords: Reading }) => void; fail: (error: { code: number; PERMISSION_DENIED: number }) => void };

/** A fake geolocation whose readings the test pushes by hand. */
function fakeGeolocation() {
  const handlers: Handlers = { ok: () => undefined, fail: () => undefined };
  const clearWatch = vi.fn();
  const geolocation = {
    watchPosition: vi.fn((ok: Handlers["ok"], fail: Handlers["fail"]) => {
      handlers.ok = ok;
      handlers.fail = fail;
      return 7;
    }),
    clearWatch,
  };
  vi.stubGlobal("navigator", { geolocation });
  const reading = (accuracy: number, latitude = -7.27) => handlers.ok({ coords: { latitude, longitude: 112.8, accuracy } });
  return { reading, handlers, clearWatch };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("getBestPosition", () => {
  it("keeps the most precise reading and stops watching when the window ends", async () => {
    const geo = fakeGeolocation();
    const progress: number[] = [];
    const result = getBestPosition((a) => progress.push(a));
    geo.reading(900, -7.1);
    geo.reading(120, -7.28);
    geo.reading(300, -7.5);
    await vi.advanceTimersByTimeAsync(BEST_FIX_WINDOW_MS);
    expect(await result).toEqual({ ok: true, latitude: -7.28, longitude: 112.8, accuracy: 120 });
    expect(progress).toEqual([900, 120]);
    expect(geo.clearWatch).toHaveBeenCalledWith(7);
  });

  it("stops early once a reading is good enough", async () => {
    const geo = fakeGeolocation();
    const result = getBestPosition();
    geo.reading(800);
    geo.reading(GOOD_ENOUGH_METERS);
    expect(await result).toMatchObject({ ok: true, accuracy: GOOD_ENOUGH_METERS });
    expect(geo.clearWatch).toHaveBeenCalled();
  });

  it("fails with a blocked permission message at once", async () => {
    const geo = fakeGeolocation();
    const result = getBestPosition();
    geo.handlers.fail({ code: 1, PERMISSION_DENIED: 1 });
    const found = await result;
    expect(found.ok).toBe(false);
    expect(found.ok === false && found.message).toContain("blocked");
  });

  it("fails after the window when no reading ever came", async () => {
    fakeGeolocation();
    const result = getBestPosition();
    await vi.advanceTimersByTimeAsync(BEST_FIX_WINDOW_MS);
    expect((await result).ok).toBe(false);
  });
});
