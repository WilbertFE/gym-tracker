import { DEFAULT_PREFS, type Prefs, type SeraMode } from "@/lib/mascot/state";

/** Where Sera's settings and memory live: this device only, in `localStorage`. */
export const MODE_KEY = "ml:sera:mode";
export const QUIET_KEY = "ml:sera:quiet-until";
export const MEMORY_KEY = "ml:sera:memory";
/** Fired on the window when her mode or quiet time changes, so every part of the page notices. */
export const PREFS_EVENT = "ml:sera-prefs";
/** A page that wants her to speak about itself sends this, with the locked feature in `detail`. */
export const CUE_EVENT = "ml:sera-cue";

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Without storage the choice lasts until the page closes, which is fine.
  }
};

/** A stable text for `useSyncExternalStore`: it changes only when a setting does. */
export const prefsSnapshot = (): string => `${read(MODE_KEY) ?? "normal"}|${read(QUIET_KEY) ?? ""}`;
export const prefsServerSnapshot = (): string => "normal|";

export function parsePrefs(snapshot: string): Prefs {
  const [mode, quiet] = snapshot.split("|");
  const until = Number(quiet);
  return {
    mode: mode === "quiet" || mode === "off" ? (mode as SeraMode) : "normal",
    quietUntil: quiet && Number.isFinite(until) ? until : DEFAULT_PREFS.quietUntil,
  };
}

export function subscribePrefs(notify: () => void): () => void {
  window.addEventListener(PREFS_EVENT, notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener(PREFS_EVENT, notify);
    window.removeEventListener("storage", notify);
  };
}

export function setMode(mode: SeraMode): void {
  write(MODE_KEY, mode === "normal" ? null : mode);
  window.dispatchEvent(new Event(PREFS_EVENT));
}

export function setQuietUntil(untilMs: number | null): void {
  write(QUIET_KEY, untilMs === null ? null : String(untilMs));
  window.dispatchEvent(new Event(PREFS_EVENT));
}

export const readMemoryText = (): string | null => read(MEMORY_KEY);
export const writeMemoryText = (text: string): void => write(MEMORY_KEY, text);
