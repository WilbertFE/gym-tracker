"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { RankBadge } from "@/components/rank-badge";
import { cn } from "@/lib/utils";
import { LEVEL_COOKIE, parseLevelCookie, writeCookie } from "@/lib/feature-prefs";
import { diffXp, levelsGained, mergeGains, XP_CHECK_EVENT, type XpGain, type XpSnapshot } from "@/lib/xp-diff";
import { xpPopupsEnabled } from "@/lib/xp-popup-pref";

const SNAPSHOT_KEY = "gymtrack:xp-snapshot";
/** Waits this long after an action so a burst of actions (several sets) becomes one check. */
const DEBOUNCE_MS = 800;
const SHOW_MS = 3500;
/** A level up or a new rank is worth a little longer. */
const SHOW_LONG_MS = 5500;
const MAX_ITEMS = 3;

function readSnapshot(): XpSnapshot | null {
  try {
    return JSON.parse(localStorage.getItem(SNAPSHOT_KEY) ?? "null");
  } catch {
    return null;
  }
}

function writeSnapshot(snapshot: XpSnapshot) {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // Blocked storage only means the first check after a reload starts from a fresh baseline.
  }
}

async function fetchSnapshot(): Promise<XpSnapshot | null> {
  try {
    const res = await fetch("/api/xp", { cache: "no-store" });
    if (!res.ok) return null;
    return ((await res.json()) as { data: XpSnapshot }).data;
  } catch {
    return null;
  }
}

const subscribeMotion = (notify: () => void) => {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Watches for XP. After a write that can earn XP the app fires an event, this waits a moment, asks the
 * server for the current XP, and compares it with what it saw last. A gain shows one small pop-up that
 * fills the level bar. It is mounted once for the whole app and never blocks anything.
 */
export function XpWatcher() {
  const router = useRouter();
  const baseline = useRef<XpSnapshot | null>(null);
  const ready = useRef<Promise<void>>(Promise.resolve());
  const [shown, setShown] = useState<{ id: number; gain: XpGain } | null>(null);
  const close = useCallback(() => setShown(null), []);

  useEffect(() => {
    baseline.current = readSnapshot();
    // The starting point is whatever XP the user has right now, so only gains after this show up.
    ready.current = fetchSnapshot().then((snapshot) => {
      if (!snapshot) return;
      baseline.current = snapshot;
      writeSnapshot(snapshot);
      rememberLevel(snapshot.level);
    });

    // The menu is built from a level cookie. When the real level differs, store it and rebuild the page once.
    const rememberLevel = (level: number) => {
      const known = parseLevelCookie(document.cookie.split("; ").find((c) => c.startsWith(`${LEVEL_COOKIE}=`))?.split("=")[1]);
      if (known === level) return;
      writeCookie(LEVEL_COOKIE, String(level));
      router.refresh();
    };

    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = async () => {
      await ready.current;
      const next = await fetchSnapshot();
      if (!next) return;
      rememberLevel(next.level);
      const found = diffXp(baseline.current, next);
      const changed = baseline.current !== null && baseline.current.total !== next.total;
      baseline.current = next;
      writeSnapshot(next);
      // Anyone on the leaderboard gets their score refreshed. The server ignores it for everyone else.
      if (changed) void fetch("/api/leaderboard/sync", { method: "POST" }).catch(() => {});
      if (!found || !xpPopupsEnabled()) return;
      // A pop-up still on screen grows to include the new gain instead of queueing another one.
      setShown((current) => ({ id: (current?.id ?? 0) + 1, gain: current ? mergeGains(current.gain, found) : found }));
    };
    const onEvent = () => {
      clearTimeout(timer);
      timer = setTimeout(check, DEBOUNCE_MS);
    };

    window.addEventListener(XP_CHECK_EVENT, onEvent);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(XP_CHECK_EVENT, onEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!shown) return null;
  return <XpToast key={shown.id} gain={shown.gain} onClose={close} />;
}

function XpToast({ gain, onClose }: { gain: XpGain; onClose: () => void }) {
  const reduced = useSyncExternalStore(subscribeMotion, prefersReducedMotion, () => false);
  const jumps = levelsGained(gain) > 0;

  // The bar starts where it was. With less motion asked for, it starts at the end instead.
  const [pct, setPct] = useState(reduced ? gain.to.progress * 100 : gain.from.progress * 100);
  const [animate, setAnimate] = useState(false);
  const [level, setLevel] = useState(reduced ? gain.to.level : gain.from.level);
  const [celebrate, setCelebrate] = useState(reduced && jumps);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));

    if (!reduced) {
      // Fill toward the end of the level, or straight to the new position when no level was gained.
      later(() => {
        setAnimate(true);
        setPct(jumps ? 100 : gain.to.progress * 100);
      }, 60);
      if (jumps) {
        later(() => {
          // Level up: flash the new level, empty the bar without animating, then fill it to its place.
          setCelebrate(true);
          setLevel(gain.to.level);
          setAnimate(false);
          setPct(0);
        }, 900);
        later(() => {
          setAnimate(true);
          setPct(gain.to.progress * 100);
        }, 1000);
      }
    }
    later(onClose, jumps || gain.rankedUp ? SHOW_LONG_MS : SHOW_MS);
    return () => timers.forEach(clearTimeout);
  }, [gain, jumps, onClose, reduced]);

  const extra = gain.items.length - MAX_ITEMS;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-20 z-50 flex justify-center md:inset-x-auto md:bottom-6 md:right-6 md:justify-end"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={`Plus ${gain.gained} XP. Tap to dismiss.`}
        className="pointer-events-auto flex w-full max-w-sm items-center gap-3 border border-primary/60 bg-card p-3 text-left shadow-lg motion-safe:animate-[xp-in_0.25s_ease-out]"
      >
        {gain.rankedUp && (
          <span className="motion-safe:animate-[xp-pop_0.6s_ease-out]">
            <RankBadge rank={gain.rank} size={64} />
          </span>
        )}

        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="tabular flex items-baseline justify-between gap-3">
            <span className="text-2xl font-semibold leading-none text-primary">
              +{gain.gained} XP
              {gain.boosted && <span className="ml-2 border border-primary px-1 py-0.5 align-middle text-[10px] tracking-widest">x2</span>}
            </span>
            {celebrate && (
              <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
                Level up {gain.from.level} to {gain.to.level}
              </span>
            )}
          </span>

          <span className="text-xs text-muted-foreground">
            {gain.items.slice(0, MAX_ITEMS).map((i) => `${i.label} +${i.xp}`).join(", ")}
            {extra > 0 && `, and ${extra} more`}
          </span>

          {gain.rankedUp && (
            <span className="tabular text-[11px] uppercase tracking-widest text-foreground">New rank: {gain.rank.name}</span>
          )}

          <span className="flex items-center gap-2">
            <span className="tabular w-10 text-[10px] text-muted-foreground">Lv {level}</span>
            <span className="h-1.5 flex-1 bg-intensity-none">
              <span
                className={cn("block h-full bg-primary", animate && "transition-[width] duration-700 ease-out")}
                style={{ width: `${pct}%` }}
              />
            </span>
            <span className="tabular w-10 text-right text-[10px] text-muted-foreground">Lv {level + 1}</span>
          </span>
        </span>
      </button>
    </div>
  );
}
