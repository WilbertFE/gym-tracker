// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GRADE_ORDER } from "@/lib/items";
import { MOODS } from "@/lib/mascot/types";
import { BLIP_PITCH, buzz, midiToHz, playSound, resetSoundEngine, revealBuzz, revealNotes, setSoundEnabled, sparkles, soundEnabled, tonesFor, type SoundName } from "@/lib/sound";

const NAMES: SoundName[] = ["chestShake", "chestOpen", "reveal", "xpTick", "levelUp", "rankUp", "stageAppear", "seraBlip", "tourStep", "workoutDone", "setLogged", "checkIn", "hit", "crit", "monsterStrike", "victory"];

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
        // A burst of noise has a filter instead of a pitch.
        if (tone.noise) {
          expect(tone.noise.from, name).toBeGreaterThan(20);
          expect(tone.noise.to, name).toBeGreaterThan(20);
        } else {
          expect(tone.freq, name).toBeGreaterThan(20);
          expect(tone.freq, name).toBeLessThan(14_000);
        }
        expect(tone.at, name).toBeGreaterThanOrEqual(0);
        expect(tone.dur, name).toBeGreaterThan(0);
        expect(tone.dur + tone.at, name).toBeLessThan(2.2);
        expect(tone.gain ?? 0.4, name).toBeLessThanOrEqual(0.6);
      }
    }
  });

  it("makes a rarer reveal a bigger sound: more tones, and a low warm note for the two highest grades", () => {
    const count = (g: (typeof GRADE_ORDER)[number]) => tonesFor("reveal", { grade: g }).length;
    expect(count("common")).toBe(1);
    expect(count("mythic")).toBeGreaterThan(count("rare"));
    const lowest = (g: (typeof GRADE_ORDER)[number]) => Math.min(...tonesFor("reveal", { grade: g }).filter((t) => !t.noise).map((t) => t.freq));
    expect(lowest("legendary")).toBeLessThan(lowest("epic"));
  });

  it("builds the chest as a sequence: a rattle that speeds up, then a lock click, a creak, air and a thump", () => {
    const shake = tonesFor("chestShake");
    const rattles = shake.filter((t) => t.noise?.filter === "highpass").map((t) => t.at);
    expect(rattles.length).toBeGreaterThanOrEqual(6);
    // The gaps between rattles shrink, so it sounds like it strains harder and harder.
    const gaps = rattles.slice(1).map((at, i) => at - rattles[i]);
    expect(gaps[gaps.length - 1]).toBeLessThan(gaps[0]);
    expect(shake.some((t) => t.noise?.filter === "lowpass")).toBe(true);

    const open = tonesFor("chestOpen");
    expect(open.some((t) => t.type === "square")).toBe(true);
    expect(open.some((t) => t.noise?.filter === "bandpass")).toBe(true);
    expect(open.some((t) => !t.noise && t.to !== undefined && t.to < t.freq)).toBe(true);
  });

  it("scatters more sparkles for a better find, and none for Common", () => {
    expect(sparkles("common")).toHaveLength(0);
    expect(GRADE_ORDER.map((g) => sparkles(g).length)).toEqual([0, 2, 4, 6, 8, 10]);
    expect(tonesFor("reveal", { grade: "mythic" }).length).toBeGreaterThan(tonesFor("reveal", { grade: "legendary" }).length);
    // A mythic find ends on a deep rumble.
    expect(Math.min(...tonesFor("reveal", { grade: "mythic" }).filter((t) => !t.noise).map((t) => t.freq))).toBeLessThan(50);
  });

  it("buzzes longer for a better find, and only when sound is on and the device can vibrate", () => {
    expect(revealBuzz("common").length).toBeLessThan(revealBuzz("rare").length);
    expect(revealBuzz("rare").length).toBeLessThan(revealBuzz("legendary").length);
    const vibrate = vi.fn();
    vi.stubGlobal("navigator", { vibrate });
    buzz(40);
    expect(vibrate).toHaveBeenCalledWith(40);
    setSoundEnabled(false);
    buzz(40);
    expect(vibrate).toHaveBeenCalledTimes(1);
    vi.stubGlobal("navigator", {});
    expect(() => buzz(40)).not.toThrow();
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
      sampleRate = 8000;
      createBuffer(_channels: number, length: number) {
        return { getChannelData: () => new Float32Array(length) };
      }
      createBufferSource() {
        return { buffer: null, connect: (node: unknown) => node, start: () => started.push(1), stop: vi.fn() };
      }
      createBiquadFilter() {
        return { type: "lowpass", Q: { value: 1 }, frequency: param(), connect: (node: unknown) => node };
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
    // Epic: four climbing notes, the shimmer, sparkles, a bright chord and a burst of air, tones and noise alike.
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
