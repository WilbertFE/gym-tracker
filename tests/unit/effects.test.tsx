// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));
vi.mock("@/lib/sound", async (original) => ({ ...(await original<typeof import("@/lib/sound")>()), playSound: vi.fn() }));

import { GameEffects } from "@/app/(app)/settings/components/game-effects";
import { EFFECTS_HELP, EFFECTS_PRESETS, EFFECTS_MODES, effectsMode, type Effects } from "@/lib/effects";
import { QUICK_CHESTS_COOKIE } from "@/lib/feature-prefs";
import { soundEnabled } from "@/lib/sound";
import { levelUpScreenEnabled, xpPopupsEnabled } from "@/lib/xp-popup-pref";
import { MODE_KEY } from "@/components/mascot/prefs";

beforeEach(() => {
  localStorage.clear();
  document.cookie = `${QUICK_CHESTS_COOKIE}=; path=/; max-age=0`;
  refresh.mockClear();
});
afterEach(cleanup);

describe("the effects modes", () => {
  it("are Full, Quiet and Off, and each reads back as itself", () => {
    expect(EFFECTS_MODES).toEqual(["full", "quiet", "off"]);
    for (const mode of EFFECTS_MODES) expect(effectsMode(EFFECTS_PRESETS[mode])).toBe(mode);
  });

  it("start the app as Full, as it has always been, and get quieter step by step", () => {
    expect(EFFECTS_PRESETS.full).toEqual({ sera: "normal", popups: true, levelScreen: true, quickChests: false, sound: true });
    expect(EFFECTS_PRESETS.quiet).toMatchObject({ sera: "quiet", sound: false, levelScreen: false });
    expect(EFFECTS_PRESETS.off).toMatchObject({ sera: "off", popups: false, sound: false });
  });

  it("read back as custom when the switches were set one by one", () => {
    const mixed: Effects = { ...EFFECTS_PRESETS.full, sound: false };
    expect(effectsMode(mixed)).toBe("custom");
    expect(effectsMode({ ...EFFECTS_PRESETS.off, popups: true })).toBe("custom");
  });

  it("each have a line of help with no em dash", () => {
    for (const mode of EFFECTS_MODES) {
      expect(EFFECTS_HELP[mode].length).toBeGreaterThan(10);
      expect(EFFECTS_HELP[mode]).not.toContain("—");
    }
  });
});

describe("the game effects control", () => {
  // The Sera control under Advanced has a Quiet and an Off of its own, so look inside the main group.
  const radio = (name: string) => within(screen.getByRole("radiogroup", { name: "Game effects" })).getByRole("radio", { name });

  it("starts as Full for a new device", () => {
    render(<GameEffects quickChests={false} />);
    expect(radio("Full").getAttribute("aria-checked")).toBe("true");
    expect(radio("Quiet").getAttribute("aria-checked")).toBe("false");
  });

  it("sets all five preferences at once when Quiet is chosen", () => {
    render(<GameEffects quickChests={false} />);
    fireEvent.click(radio("Quiet"));
    expect(localStorage.getItem(MODE_KEY)).toBe("quiet");
    expect(soundEnabled()).toBe(false);
    expect(levelUpScreenEnabled()).toBe(false);
    expect(xpPopupsEnabled()).toBe(true);
    expect(document.cookie).toContain(`${QUICK_CHESTS_COOKIE}=1`);
    expect(radio("Quiet").getAttribute("aria-checked")).toBe("true");
    expect(refresh).toHaveBeenCalled();
  });

  it("switches everything off, and back to Full", () => {
    render(<GameEffects quickChests={false} />);
    fireEvent.click(radio("Off"));
    expect(localStorage.getItem(MODE_KEY)).toBe("off");
    expect(xpPopupsEnabled()).toBe(false);
    fireEvent.click(radio("Full"));
    expect(localStorage.getItem(MODE_KEY)).toBeNull();
    expect(xpPopupsEnabled()).toBe(true);
    expect(soundEnabled()).toBe(true);
    expect(document.cookie).not.toContain(`${QUICK_CHESTS_COOKIE}=1`);
  });

  it("shows Custom and selects none of the three when one switch under Advanced is changed", () => {
    render(<GameEffects quickChests={false} />);
    fireEvent.click(screen.getByLabelText("Play sounds for chests, XP, level ups and Sera"));
    expect(soundEnabled()).toBe(false);
    for (const name of ["Full", "Quiet", "Off"]) expect(radio(name).getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText(/Custom: you set the switches below/)).toBeTruthy();
  });

  it("keeps every single switch under Advanced", () => {
    render(<GameEffects quickChests={false} />);
    expect(screen.getByText("Advanced: set each one")).toBeTruthy();
    for (const label of ["Open chests quickly", "Show a small pop-up when I earn XP", "Full screen for big level ups, new ranks and unlocks", "Play sounds for chests, XP, level ups and Sera"]) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
    expect(screen.getByRole("radiogroup", { name: "Sera" })).toBeTruthy();
  });
});
