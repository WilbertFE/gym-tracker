// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GRADE_ORDER } from "@/lib/items";
import { MOODS } from "@/lib/mascot/types";
import { BLIP_PITCH, midiToHz, playSound, resetSoundEngine, revealNotes, setSoundEnabled, soundEnabled, tonesFor, type SoundName } from "@/lib/sound";

const NAMES: SoundName[] = ["chestShake", "chestOpen", "reveal", "xpTick", "levelUp", "rankUp", "stageAppear", "seraBlip", "tourStep", "workoutDone", "setLogged", "checkIn"];

beforeEach(() => {
  localStorage.clear();
  resetSoundEngine();
});
afterEach(() => vi.unstubAllGlobals());

describe("the notes", () => {
  it("puts A above middle C at 440 Hz and doubles for every octave", () => {
    expect(midiToHz(69)).toBe(440);
    expect(midiToHz(81)).toBeCloseTo(880);
    expect(midiToHz(57)).toBeCloseTo(220);
  });

  it("climbs one note for every diamond of a grade, so a rarer item is a longer run", () => {
    expect(GRADE_ORDER.map((g) => revealNotes(g).length)).toEqual([1, 2, 3, 4, 5, 6]);
    for (const grade of GRADE_ORDER) {
      const notes = revealNotes(grade);
      expect(notes, grade).toEqual([...notes].sort((a, b) => a - b));
    }
    expect(revealNotes("mythic").slice(0, 3)).toEqual(revealNotes("rare"));
  });

  it("gives every sound at least one tone with a sane pitch, length and loudness", () => {
    for (const name of NAMES) {
      const tones = tonesFor(name, { grade: "legendary", mood: "smug" });
      expect(tones.length, name).toBeGreaterThan(0);
      for (const tone of tones) {
        expect(tone.freq, name).toBeGreaterThan(20);
        expect(tone.freq, name).toBeLessThan(8000);
        expect(tone.at, name).toBeGreaterThanOrEqual(0);
        expect(tone.dur, name).toBeGreaterThan(0);
        expect(tone.dur + tone.at, name).toBeLessThan(2);
        expect(tone.gain ?? 0.4, name).toBeLessThanOrEqual(0.6);
      }
    }
  });

  it("makes a rarer reveal a bigger sound: more tones, and a low warm note for the two highest grades", () => {
    const count = (g: (typeof GRADE_ORDER)[number]) => tonesFor("reveal", { grade: g }).length;
    expect(count("common")).toBe(1);
    expect(count("mythic")).toBeGreaterThan(count("rare"));
    const lowest = (g: (typeof GRADE_ORDER)[number]) => Math.min(...tonesFor("reveal", { grade: g }).map((t) => t.freq));
    expect(lowest("legendary")).toBeLessThan(lowest("epic"));
  });

  it("pitches her blip lower when she is smug or annoyed and higher when she is happy or flustered", () => {
    for (const mood of MOODS) expect(BLIP_PITCH[mood], mood).toBeGreaterThan(0.5);
    const blip = (mood: (typeof MOODS)[number]) => tonesFor("seraBlip", { mood })[0].freq;
    expect(blip("smug")).toBeLessThan(blip("calm"));
    expect(blip("annoyed")).toBeLessThan(blip("calm"));
    expect(blip("flustered")).toBeGreaterThan(blip("calm"));
  });
});

describe("the sound setting", () => {
  it("is on until it is turned off, and remembers that on this device", () => {
    expect(soundEnabled()).toBe(true);
    setSoundEnabled(false);
    expect(soundEnabled()).toBe(false);
    expect(localStorage.getItem("ml:sound")).toBe("off");
    setSoundEnabled(true);
    expect(soundEnabled()).toBe(true);
    expect(localStorage.getItem("ml:sound")).toBeNull();
  });
});

describe("playSound", () => {
  /** A fake audio engine that counts the oscillators it is asked to start. */
  function fakeAudio(state: AudioContextState = "running") {
    const started: number[] = [];
    const param = () => ({ value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
    class FakeContext {
      state = state;
      currentTime = 0;
      destination = {};
      resume = vi.fn().mockResolvedValue(undefined);
      createGain() {
        return { gain: param(), connect: (node: unknown) => node };
      }
      createOscillator() {
        return {
          type: "sine",
          frequency: param(),
          connect: (node: unknown) => node,
          start: () => started.push(1),
          stop: vi.fn(),
        };
      }
    }
    vi.stubGlobal("AudioContext", FakeContext);
    Object.defineProperty(window, "AudioContext", { value: FakeContext, configurable: true });
    return started;
  }

  it("does nothing, and does not throw, when the browser has no audio", () => {
    Object.defineProperty(window, "AudioContext", { value: undefined, configurable: true });
    expect(() => playSound("levelUp")).not.toThrow();
  });

  it("plays one oscillator per tone when audio is running", () => {
    const started = fakeAudio("running");
    playSound("reveal", { grade: "epic" });
    // Epic: four climbing notes and the shimmer on top.
    expect(started.length).toBe(tonesFor("reveal", { grade: "epic" }).length);
  });

  it("is silent when sound is off", () => {
    const started = fakeAudio("running");
    setSoundEnabled(false);
    playSound("levelUp");
    expect(started).toHaveLength(0);
  });

  it("skips the sound while the browser still has audio locked", () => {
    const started = fakeAudio("suspended");
    playSound("levelUp");
    expect(started).toHaveLength(0);
  });
});
