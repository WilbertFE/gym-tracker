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

/** A burst of filtered noise instead of a pitch: a rattle, a creak, a whoosh, a sparkle of air. */
export type Noise = {
  filter: BiquadFilterType;
  /** The filter's cutoff, sliding from `from` to `to` over the burst. */
  from: number;
  to: number;
  q?: number;
};

export type Tone = {
  freq: number;
  /** Seconds after the start of the sound. */
  at: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  /** Slide to this pitch by the end of the tone. */
  to?: number;
  /** Makes this a burst of noise through a filter (`freq` is then ignored). */
  noise?: Noise;
};

/** The tones of every sound but the reveal, which depends on the grade. */
const TONES: Record<Exclude<SoundName, "reveal" | "seraBlip">, Tone[]> = {
  // The chest strains against its lock: a low rumble that climbs, wood rattling faster and faster, and a riser of
  // tension that rushes up just before it gives.
  chestShake: [
    { freq: 55, at: 0, dur: 0.82, type: "sawtooth", gain: 0.45, to: 110 },
    { freq: 82, at: 0.05, dur: 0.76, type: "triangle", gain: 0.3, to: 165 },
    { freq: 0, at: 0, dur: 0.82, gain: 0.35, noise: { filter: "lowpass", from: 180, to: 700, q: 1 } },
    ...[0.04, 0.2, 0.34, 0.46, 0.56, 0.65, 0.72, 0.78].map((at, i): Tone => ({ freq: 0, at, dur: 0.045, gain: 0.3 + i * 0.03, noise: { filter: "highpass", from: 1800, to: 900, q: 0.8 } })),
    { freq: 220, at: 0.4, dur: 0.42, type: "sine", gain: 0.22, to: 880 },
  ],
  // The lock springs, the lid creaks up on its hinges, air rushes out and a deep thump lands under it.
  chestOpen: [
    { freq: 2400, at: 0, dur: 0.03, type: "square", gain: 0.22, to: 1500 },
    { freq: 0, at: 0.02, dur: 0.38, gain: 0.3, noise: { filter: "bandpass", from: 500, to: 3200, q: 1.4 } },
    { freq: 150, at: 0.03, dur: 0.3, type: "sawtooth", gain: 0.2, to: 300 },
    { freq: 120, at: 0.04, dur: 0.32, type: "sine", gain: 0.6, to: 38 },
    { freq: 0, at: 0.05, dur: 0.18, gain: 0.35, noise: { filter: "lowpass", from: 900, to: 160, q: 0.7 } },
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

/** Tiny high pings that scatter after a reveal: none for Common, more for every grade above it. */
export function sparkles(grade: Grade): Tone[] {
  const count = GRADE_ORDER.indexOf(grade) * 2;
  // Fixed positions, so a reveal sounds the same every time but never like a scale.
  const pitches = [96, 103, 100, 108, 98, 105, 101, 110, 99, 107, 104, 112];
  return Array.from({ length: count }, (_, i) => ({
    freq: midiToHz(pitches[i % pitches.length]),
    at: 0.12 + i * 0.065,
    dur: 0.22,
    type: "sine" as const,
    gain: 0.09,
  }));
}

/** The tones of one sound, ready to play. */
export function tonesFor(name: SoundName, options: SoundOptions = {}): Tone[] {
  if (name === "reveal") {
    const grade = options.grade ?? "common";
    const rank = GRADE_ORDER.indexOf(grade);
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
    tones.push(...sparkles(grade), ...(rank >= 2 ? [{ freq: 0, at: 0, dur: 0.5, gain: 0.18, noise: { filter: "highpass" as const, from: 4000, to: 9000, q: 0.6 } }] : []));
    // A rare and better find also gets a bright chord that blooms and fades, so the moment lingers.
    if (rank >= 2) {
      const base = notes[0];
      for (const step of [0, 7, 12, 16]) tones.push({ freq: midiToHz(base + step), at: 0.25, dur: 0.9 + rank * 0.12, type: "sine", gain: 0.1 });
    }
    // A mythic find ends on a rumble underneath and a rising shine, so it feels like something broke open.
    if (grade === "mythic") {
      tones.push({ freq: 40, at: 0, dur: 1.1, type: "sine", gain: 0.55, to: 30 });
      tones.push({ freq: 500, at: 0.1, dur: 0.9, type: "sawtooth", gain: 0.1, to: 2400 });
    }
    return tones;
  }
  if (name === "seraBlip") {
    const pitch = BLIP_PITCH[options.mood ?? "calm"];
    return [{ freq: 520 * pitch, at: 0, dur: 0.045, type: "square", gain: 0.12 }];
  }
  return TONES[name];
}

let context: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;
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
  noiseBuffer = null;
}

/** Two seconds of white noise, made once and reused by every rattle, creak and whoosh. */
function noise(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buffer;
  return buffer;
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
      const gain = ctx.createGain();
      const start = now + tone.at;
      const end = start + tone.dur;
      // A quick attack and a smooth fade, so a tone never clicks.
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(tone.gain ?? 0.4, start + Math.min(0.02, tone.dur / 3));
      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      if (tone.noise) {
        const source = ctx.createBufferSource();
        const filter = ctx.createBiquadFilter();
        source.buffer = noise(ctx);
        filter.type = tone.noise.filter;
        filter.Q.value = tone.noise.q ?? 1;
        filter.frequency.setValueAtTime(tone.noise.from, start);
        filter.frequency.exponentialRampToValueAtTime(tone.noise.to, end);
        source.connect(filter).connect(gain).connect(master);
        source.start(start, Math.random());
        source.stop(end + 0.02);
        continue;
      }

      const osc = ctx.createOscillator();
      osc.type = tone.type ?? "sine";
      osc.frequency.setValueAtTime(tone.freq, start);
      if (tone.to) osc.frequency.exponentialRampToValueAtTime(tone.to, end);
      osc.connect(gain).connect(master);
      osc.start(start);
      osc.stop(end + 0.02);
    }
  } catch {
    // Sound is a bonus. Whatever went wrong, the app goes on without it.
  }
}

/**
 * A short buzz on a phone that can do it, for the moments a chest strains and opens. It follows the same Sound switch,
 * does nothing on a device without vibration (most desktops, and iPhones), and never throws.
 */
export function buzz(pattern: number | number[]): void {
  try {
    if (typeof navigator === "undefined" || !soundEnabled()) return;
    navigator.vibrate?.(pattern);
  } catch {
    // Vibration is a bonus too.
  }
}

/** The buzz for a reveal: a longer one for a better find. */
export const revealBuzz = (grade: Grade): number[] => {
  const rank = GRADE_ORDER.indexOf(grade);
  return rank >= 4 ? [40, 40, 40, 40, 160] : rank >= 2 ? [30, 40, 90] : [25];
};
