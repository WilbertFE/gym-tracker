/**
 * What Sera remembers, per device. It lives in `localStorage` and nothing is sent anywhere. The functions here are
 * pure (they take a memory and return a new one), so the rules are easy to test. The browser part that reads
 * and writes the storage is in `src/components/mascot/`.
 */
export type Memory = {
  v: 1;
  /** Moments already told, by key, with the day they were told. */
  told: Record<string, string>;
  /** The day `shownToday` counts, and how many times she spoke up on her own that day. */
  day: string;
  shownToday: number;
  /** The level the last page load saw, to notice a level up. Null before the first look. */
  lastLevel: number | null;
};

export type SeraMode = "normal" | "quiet" | "off";

export type Prefs = {
  mode: SeraMode;
  /** She is quiet until this moment (milliseconds), for "be quiet for today". */
  quietUntil: number | null;
};

export const DEFAULT_PREFS: Prefs = { mode: "normal", quietUntil: null };

/** The most times she speaks up on her own in a day. */
export const MAX_MOMENTS_PER_DAY = 3;

/** Told moments are forgotten after this many days, so a daily one can come back and the memory stays small. */
const KEEP_DAYS = 14;

export const emptyMemory = (today: string): Memory => ({ v: 1, told: {}, day: today, shownToday: 0, lastLevel: null });

/** Reads a memory from stored text, or starts a new one. Anything odd counts as empty. */
export function parseMemory(raw: string | null, today: string): Memory {
  if (!raw) return emptyMemory(today);
  try {
    const value = JSON.parse(raw) as Partial<Memory> | null;
    if (!value || value.v !== 1 || typeof value.told !== "object" || value.told === null) return emptyMemory(today);
    const told = Object.fromEntries(Object.entries(value.told).filter(([, day]) => typeof day === "string"));
    return {
      v: 1,
      told,
      day: typeof value.day === "string" ? value.day : today,
      shownToday: Number.isInteger(value.shownToday) ? (value.shownToday as number) : 0,
      lastLevel: Number.isInteger(value.lastLevel) ? (value.lastLevel as number) : null,
    };
  } catch {
    return emptyMemory(today);
  }
}

/** A new day starts the count over. */
export const rollDay = (memory: Memory, today: string): Memory => (memory.day === today ? memory : { ...memory, day: today, shownToday: 0 });

const daysBefore = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

/** Records a moment as told, counts it for today, and forgets the old ones. */
export function markTold(memory: Memory, key: string, today: string): Memory {
  const rolled = rollDay(memory, today);
  const told: Record<string, string> = {};
  for (const [k, day] of Object.entries(rolled.told)) if (daysBefore(day, today) <= KEEP_DAYS) told[k] = day;
  told[key] = today;
  return { ...rolled, told, shownToday: rolled.shownToday + 1 };
}

/** Notes the level seen, without counting anything. */
export const withLevel = (memory: Memory, level: number): Memory => (memory.lastLevel === level ? memory : { ...memory, lastLevel: level });

/** She keeps quiet in Quiet mode, in Off mode, and until the moment set by "be quiet for today". */
export function isSilenced(prefs: Prefs, nowMs: number): boolean {
  return prefs.mode !== "normal" || (prefs.quietUntil !== null && nowMs < prefs.quietUntil);
}

/** The end of the given day, in the browser's own time, for "be quiet for today". */
export function endOfDay(now: Date): number {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return end.getTime();
}
