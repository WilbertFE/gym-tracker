import { GRADE_ORDER, type Grade } from "@/lib/items";
import type { Mood } from "@/lib/mascot/types";

/**
 * Sound for the animations: chests, XP, level and rank ups, Sera. Everything is synthesized in the browser with the Web
 * Audio API, so there are no sound files to download or license, and nothing is played unless the browser allows it
 * (a browser only lets a page make sound after a tap) and the user has not turned Sound off in Settings. Every call is
 * safe to make anywhere: on the server, with no audio support, or while muted, it does nothing.
 */

const KEY = "ml:sound";

/** Whether sound is on. On unless the user turned it off on this device. */
export function soundEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean): void {
  try {
    if (on) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, "off");
  } catch {
    // Storage can be blocked. The choice then lasts until the page is reloaded, which is fine.
  }
}

/** The pitch of a MIDI note number, in hertz. 69 is the A above middle C, 440 Hz. */
export const midiToHz = (note: number): number => 440 * 2 ** ((note - 69) / 12);

/** A major pentatonic ladder, so any run of notes sounds pleasant. Semitones above the root. */
const LADDER = [0, 4, 7, 12, 16, 19] as const;
const ROOT = 72; // C5

/**
 * The notes of the reveal for a grade: one note for every diamond of the grade, climbing, so a rarer item is a longer,
 * higher run. Common is a single note and Mythic climbs all six.
 */
export function revealNotes(grade: Grade): number[] {
  return LADDER.slice(0, GRADE_ORDER.indexOf(grade) + 1).map((step) => ROOT + step);
}

export type SoundName =
  | "chestShake"
  | "chestOpen"
  | "reveal"
  | "xpTick"
  | "levelUp"
  | "rankUp"
  | "stageAppear"
  | "seraBlip"
  | "tourStep"
  | "workoutDone"
  | "setLogged"
  | "checkIn";

export type SoundOptions = {
  /** For `reveal`: the grade that was won. */
  grade?: Grade;
  /** For `seraBlip`: her mood, which moves the pitch of her blip a little. */
  mood?: Mood;
};

/** Her blip is lower when she is smug or annoyed, higher when she is happy or flustered. */
export const BLIP_PITCH: Record<Mood, number> = {
  calm: 1,
  happy: 1.12,
  cheer: 1.2,
  thinking: 0.98,
  surprised: 1.25,
  sleepy: 0.8,
  smug: 0.9,
  flustered: 1.18,
  annoyed: 0.84,
};

type Tone = {
  freq: number;
  /** Seconds after the start of the sound. */
  at: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  /** Slide to this pitch by the end of the tone. */
  to?: number;
};

/** The tones of every sound but the reveal, which depends on the grade. */
const TONES: Record<Exclude<SoundName, "reveal" | "seraBlip">, Tone[]> = {
  chestShake: [
    { freq: 62, at: 0, dur: 0.8, type: "sawtooth", gain: 0.5, to: 90 },
    { freq: 93, at: 0.05, dur: 0.75, type: "triangle", gain: 0.35, to: 140 },
  ],
  chestOpen: [
    { freq: 180, at: 0, dur: 0.35, type: "triangle", gain: 0.5, to: 560 },
    { freq: 90, at: 0, dur: 0.2, type: "sine", gain: 0.5, to: 45 },
  ],
  xpTick: [{ freq: 880, at: 0, dur: 0.09, type: "triangle", gain: 0.35, to: 1320 }],
  levelUp: [
    { freq: midiToHz(72), at: 0, dur: 0.16, type: "triangle", gain: 0.5 },
    { freq: midiToHz(76), at: 0.11, dur: 0.16, type: "triangle", gain: 0.5 },
    { freq: midiToHz(79), at: 0.22, dur: 0.16, type: "triangle", gain: 0.5 },
    { freq: midiToHz(84), at: 0.33, dur: 0.5, type: "triangle", gain: 0.55 },
    { freq: midiToHz(88), at: 0.33, dur: 0.5, type: "sine", gain: 0.25 },
  ],
  rankUp: [
    { freq: midiToHz(60), at: 0, dur: 0.7, type: "sawtooth", gain: 0.18 },
    { freq: midiToHz(72), at: 0, dur: 0.14, type: "triangle", gain: 0.5 },
    { freq: midiToHz(76), at: 0.1, dur: 0.14, type: "triangle", gain: 0.5 },
    { freq: midiToHz(79), at: 0.2, dur: 0.14, type: "triangle", gain: 0.5 },
    { freq: midiToHz(84), at: 0.3, dur: 0.14, type: "triangle", gain: 0.5 },
    { freq: midiToHz(88), at: 0.4, dur: 0.14, type: "triangle", gain: 0.5 },
    { freq: midiToHz(91), at: 0.5, dur: 0.9, type: "triangle", gain: 0.55 },
    { freq: midiToHz(95), at: 0.5, dur: 0.9, type: "sine", gain: 0.25 },
  ],
  stageAppear: [
    { freq: midiToHz(76), at: 0, dur: 0.22, type: "sine", gain: 0.4 },
    { freq: midiToHz(83), at: 0.12, dur: 0.4, type: "sine", gain: 0.4 },
  ],
  tourStep: [{ freq: 660, at: 0, dur: 0.07, type: "triangle", gain: 0.3 }],
  workoutDone: [
    { freq: midiToHz(67), at: 0, dur: 0.14, type: "triangle", gain: 0.5 },
    { freq: midiToHz(72), at: 0.12, dur: 0.14, type: "triangle", gain: 0.5 },
    { freq: midiToHz(76), at: 0.24, dur: 0.45, type: "triangle", gain: 0.55 },
  ],
  setLogged: [{ freq: 440, at: 0, dur: 0.05, type: "triangle", gain: 0.3, to: 520 }],
  checkIn: [
    { freq: midiToHz(72), at: 0, dur: 0.12, type: "triangle", gain: 0.45 },
    { freq: midiToHz(79), at: 0.1, dur: 0.25, type: "triangle", gain: 0.45 },
  ],
};

/** How loud everything is, from 0 to 1. One place to turn it all up or down. */
const MASTER_GAIN = 0.22;

/** The tones of one sound, ready to play. */
export function tonesFor(name: SoundName, options: SoundOptions = {}): Tone[] {
  if (name === "reveal") {
    const grade = options.grade ?? "common";
    const notes = revealNotes(grade);
    const grand = GRADE_ORDER.indexOf(grade) >= 4;
    const tones: Tone[] = notes.map((note, i) => ({
      freq: midiToHz(note),
      at: i * 0.09,
      dur: i === notes.length - 1 ? 0.55 : 0.16,
      type: "triangle",
      gain: 0.5,
    }));
    // The top of the run shimmers an octave up, and a grand grade gets a low, warm note under it.
    if (notes.length >= 3) tones.push({ freq: midiToHz(notes[notes.length - 1] + 12), at: (notes.length - 1) * 0.09, dur: 0.6, type: "sine", gain: 0.22 });
    if (grand) tones.push({ freq: midiToHz(ROOT - 24), at: 0, dur: 0.9, type: "sine", gain: 0.5 });
    return tones;
  }
  if (name === "seraBlip") {
    const pitch = BLIP_PITCH[options.mood ?? "calm"];
    return [{ freq: 520 * pitch, at: 0, dur: 0.045, type: "square", gain: 0.12 }];
  }
  return TONES[name];
}

let context: AudioContext | null = null;
let primed = false;

type AudioWindow = Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (context) return context;
  const Ctor = (window as AudioWindow).AudioContext ?? (window as AudioWindow).webkitAudioContext;
  if (!Ctor) return null;
  try {
    context = new Ctor();
  } catch {
    return null;
  }
  return context;
}

/**
 * A browser keeps audio locked until the person taps or presses a key. The first one wakes the audio up, so the
 * sounds after that can play. Safe to call many times.
 */
export function primeSound(): void {
  if (primed || typeof window === "undefined") return;
  primed = true;
  const wake = () => {
    void audio()?.resume().catch(() => undefined);
    window.removeEventListener("pointerdown", wake);
    window.removeEventListener("keydown", wake);
  };
  window.addEventListener("pointerdown", wake);
  window.addEventListener("keydown", wake);
}

/** Test helper: forgets the audio engine, so the next sound makes a fresh one. */
export function resetSoundEngine(): void {
  context = null;
}

/** Plays a sound, if sound is on and the browser allows it. Never throws. */
export function playSound(name: SoundName, options: SoundOptions = {}): void {
  try {
    if (typeof window === "undefined" || !soundEnabled()) return;
    primeSound();
    const ctx = audio();
    if (!ctx) return;
    // Still locked (nobody has tapped yet): skip it instead of queueing a sound for later.
    if (ctx.state !== "running") {
      void ctx.resume().catch(() => undefined);
      return;
    }
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.value = MASTER_GAIN;
    master.connect(ctx.destination);
    for (const tone of tonesFor(name, options)) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + tone.at;
      const end = start + tone.dur;
      osc.type = tone.type ?? "sine";
      osc.frequency.setValueAtTime(tone.freq, start);
      if (tone.to) osc.frequency.exponentialRampToValueAtTime(tone.to, end);
      // A quick attack and a smooth fade, so a tone never clicks.
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(tone.gain ?? 0.4, start + Math.min(0.02, tone.dur / 3));
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gain).connect(master);
      osc.start(start);
      osc.stop(end + 0.02);
    }
  } catch {
    // Sound is a bonus. Whatever went wrong, the app goes on without it.
  }
}
