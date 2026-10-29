"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api-client";
import type { AvailableChest } from "@/lib/chests";
import { GRADE_ORDER, GRADES, gradeRank, SLOTS, type Equipment, type Grade, type Item } from "@/lib/items";
import type { Rank } from "@/lib/ranks";
import { SYSTEM } from "@/lib/system-voice";
import { XP_CHECK_EVENT } from "@/lib/xp-diff";
import { ChestArt, type ChestPhase } from "./chest-art";
import { GradeLabel } from "@/components/items/grade-card";
import { ItemArt } from "@/components/items/item-art";
import { ItemMedal } from "@/components/items/item-icon";

/** What `POST /api/chests/open` returns. */
type OpenResult = {
  chestId: string;
  kind: "daily" | "weekly";
  item: Item;
  grade: Grade;
  gradeName: string;
  duplicate: boolean;
  bonusXp: number;
  remaining: number;
};

/** How long each part takes, in ms. The whole opening stays under about two and a half seconds. */
const SHAKE_MS = 800;
const OPEN_MS = 450;
const OPEN_LEGENDARY_MS = 700;
/** One burst of small shards when the lid opens. Common gets none. */
const SHARDS: Record<Grade, number> = { common: 0, rare: 10, epic: 18, legendary: 30 };
/** Where the lid meets the body, in the stage's own coordinates. Effects start here. */
const SEAM_Y = 174;

const slotName = (item: Item) => SLOTS.find((s) => s.id === item.slot)?.name ?? "";

function Shards({ count, color }: { count: number; color: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2" style={{ top: SEAM_Y }}>
      {Array.from({ length: count }, (_, i) => {
        // The spread is worked out from the index, so a burst looks scattered but is the same every time.
        const angle = (i / count) * Math.PI * 2 + (((i * 37) % 10) / 10) * 0.5;
        const distance = 90 + ((i * 53) % 80);
        const style = {
          "--dx": `${Math.round(Math.cos(angle) * distance)}px`,
          "--dy": `${Math.round(Math.sin(angle) * distance * 0.8 - 50)}px`,
          "--rot": `${((i * 47) % 180) - 90}deg`,
          "--delay": `${((i * 13) % 12) / 100}s`,
          background: color,
          boxShadow: `0 0 6px ${color}`,
        } as CSSProperties;
        return <span key={i} className="chest-shard absolute left-0 top-0 block h-2.5 w-1.5" style={style} />;
      })}
    </div>
  );
}

type Props = {
  /** The chests to open, in order. */
  chests: AvailableChest[];
  /** The user's rank, for previewing a frame on their own badge. */
  rank: Rank;
  /** What is worn now, so Equip knows what it would replace. */
  worn: Equipment;
  /** Skip straight to the result with only a short fade. Also the setting for reduced motion. */
  quick: boolean;
  onClose: () => void;
};

/**
 * The chest opening. A tap starts it, the chest shakes while the server rolls, the lid opens with a beam in
 * the color of what was won, and the item turns up out of the chest. It stays short, plays once, has no
 * sound, can be skipped with a tap anywhere, and with reduced motion (or the quick setting) it is a fade.
 */
export function ChestOpener({ chests, rank, worn, quick, onClose }: Props) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<ChestPhase>("idle");
  const [waiting, setWaiting] = useState(false);
  const [result, setResult] = useState<OpenResult | null>(null);
  const [glow, setGlow] = useState<string>(GRADES.rare.color);
  const [calm, setCalm] = useState(quick);
  const [wornNow, setWornNow] = useState<Equipment>(worn);
  const [equipping, setEquipping] = useState(false);

  const alive = useRef(true);
  const skipped = useRef(false);
  const waiters = useRef<(() => void)[]>([]);
  const opened = useRef<OpenResult[]>([]);
  const mainButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const chest = chests[index];
  const remaining = chests.length - index - 1;

  /** Waits, unless the user skipped: a skip ends every wait at once. */
  const wait = useCallback(
    (ms: number) =>
      new Promise<void>((resolve) => {
        if (skipped.current) return resolve();
        const done = () => {
          clearTimeout(timer);
          resolve();
        };
        const timer = setTimeout(done, ms);
        waiters.current.push(done);
      }),
    [],
  );

  const skip = useCallback(() => {
    skipped.current = true;
    waiters.current.forEach((done) => done());
    waiters.current = [];
  }, []);

  const close = useCallback(() => {
    // A repeat pays a little XP, so let the pop-up show it now that the opening is over.
    if (opened.current.some((o) => o.duplicate)) window.dispatchEvent(new Event(XP_CHECK_EVENT));
    onClose();
    router.refresh();
  }, [onClose, router]);

  async function open() {
    if (phase !== "idle" || !chest) return;
    skipped.current = false;
    // Asked for less motion, or the quick setting: no shake, no lid, just the result.
    const calmNow = quick || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setCalm(calmNow);
    setResult(null);
    setWaiting(false);
    setGlow(GRADES.rare.color);
    setPhase("shaking");

    // The server rolls while the chest shakes, so the animation never waits for it and it never waits for the animation.
    const request = apiRequest<OpenResult>("/api/chests/open", "POST", { chestId: chest.id });
    if (!calmNow) await wait(SHAKE_MS);
    if (!alive.current) return;
    setWaiting(true);
    const response = await request;
    if (!alive.current) return;
    setWaiting(false);

    if (!response.ok) {
      toast.error(response.error);
      setPhase("idle");
      router.refresh();
      return;
    }

    const data = response.data;
    opened.current.push(data);
    setResult(data);
    const color = GRADES[data.grade].color;

    if (!calmNow && !skipped.current) {
      setPhase("opening");
      // The light runs through the lower grades for a moment and settles on the real one.
      GRADE_ORDER.slice(0, gradeRank(data.grade) + 1).forEach((grade, i) => {
        setTimeout(() => alive.current && setGlow(GRADES[grade].color), i * 90);
      });
      await wait(data.grade === "legendary" ? OPEN_LEGENDARY_MS : OPEN_MS);
      if (!alive.current) return;
    }
    setGlow(color);
    setPhase("reveal");
  }

  function next() {
    setIndex((i) => i + 1);
    setResult(null);
    setPhase("idle");
    setGlow(GRADES.rare.color);
  }

  async function equip() {
    if (!result || equipping) return;
    setEquipping(true);
    const response = await apiRequest("/api/equipment", "PUT", { slot: result.item.slot, itemId: result.item.id });
    setEquipping(false);
    if (!response.ok) {
      toast.error(response.error);
      return;
    }
    setWornNow((current) => ({ ...current, [result.item.slot]: result.item.id }));
    toast.success(`${result.item.name} equipped`);
  }

  // Escape closes, but not in the middle of the opening: that is what a tap is for.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (phase === "idle" || phase === "reveal")) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, close]);

  useEffect(() => {
    if (phase === "idle" || phase === "reveal") mainButton.current?.focus();
  }, [phase, index]);

  if (!chest) return null;

  const gradeColor = result ? GRADES[result.grade].color : glow;
  const legendary = result?.grade === "legendary";
  const busy = phase === "shaking" || phase === "opening";
  const stage = {
    "--glow": glow,
    "--shake": `${SHAKE_MS}ms`,
    "--open": `${legendary ? OPEN_LEGENDARY_MS : OPEN_MS}ms`,
    "--reveal": legendary ? "0.7s" : quick ? "0.25s" : "0.5s",
  } as CSSProperties;
  const showEffects = !calm && result !== null && (phase === "opening" || phase === "reveal");
  const replaced = result && wornNow[result.item.slot];
  const alreadyWorn = result !== null && wornNow[result.item.slot] === result.item.id;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={chest.kind === "daily" ? "Daily chest" : "Weekly chest"}
      className="fixed inset-0 z-[60] overflow-y-auto bg-black/85 backdrop-blur-sm motion-safe:animate-[xp-in_0.3s_ease-out]"
      onClick={busy ? skip : undefined}
    >
      {legendary && phase === "reveal" && !calm && (
        <div
          aria-hidden
          className="chest-fade pointer-events-none fixed inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 38%, rgba(255, 184, 61, 0.2) 100%)" }}
        />
      )}
      {showEffects && phase === "opening" && (
        <div
          aria-hidden
          className="chest-flash pointer-events-none fixed inset-0 opacity-0"
          style={{ background: `radial-gradient(circle at 50% 45%, color-mix(in srgb, ${glow} 55%, white), transparent 62%)` }}
        />
      )}

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="flex w-full max-w-sm flex-col items-center gap-3 text-center">
          <p className="font-display relative z-10 text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">
            [ {chest.kind === "daily" ? "Daily chest" : "Weekly chest"} ]
            {chests.length > 1 && (
              <span className="tabular ml-2 text-muted-foreground">
                {index + 1} / {chests.length}
              </span>
            )}
          </p>

          <div className="relative h-[310px] w-full [perspective:900px]" style={stage}>
            {/* The chest. In the reveal it steps back so the item card has the stage. */}
            <div
              className={
                "absolute left-1/2 top-[90px] -translate-x-1/2 transition-[opacity,transform] duration-300 " +
                (phase === "reveal" ? "translate-y-6 scale-90 opacity-0" : "chest-rise")
              }
              key={chest.id}
            >
              <button
                type="button"
                onClick={open}
                disabled={phase !== "idle"}
                aria-label="Open chest"
                className="block outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
              >
                <ChestArt kind={chest.kind} phase={phase} />
              </button>
            </div>

            {showEffects && phase === "opening" && (
              <>
                <div aria-hidden className="pointer-events-none absolute left-1/2" style={{ top: SEAM_Y, transform: "translate(-50%, -100%)" }}>
                  <div className="relative h-[230px] w-[170px]">
                    <div
                      className="chest-beam absolute inset-0 origin-bottom"
                      style={{
                        background: "linear-gradient(to top, var(--glow), transparent 92%)",
                        clipPath: "polygon(34% 100%, 66% 100%, 100% 0, 0 0)",
                        transformOrigin: "50% 100%",
                        opacity: 0.85,
                      }}
                    />
                    {/* A narrower, brighter core inside the cone. */}
                    <div
                      className="chest-beam absolute bottom-0 left-1/2 h-[180px] w-[56px] -translate-x-1/2"
                      style={{
                        background: "linear-gradient(to top, rgba(255,255,255,0.95), transparent 90%)",
                        clipPath: "polygon(30% 100%, 70% 100%, 100% 0, 0 0)",
                        transformOrigin: "50% 100%",
                        filter: "blur(2px)",
                      }}
                    />
                  </div>
                </div>
                {/* The ring is centered with fixed offsets, so the animation only has to scale it. */}
                <div aria-hidden className="pointer-events-none absolute left-1/2" style={{ top: SEAM_Y }}>
                  <div
                    className="chest-ring absolute -left-20 -top-20 size-40 rounded-full border-2"
                    style={{ borderColor: "var(--glow)", boxShadow: "0 0 24px var(--glow)" }}
                  />
                </div>
              </>
            )}
            {showEffects && result && SHARDS[result.grade] > 0 && <Shards count={SHARDS[result.grade]} color={gradeColor} />}

            {phase === "reveal" && result && (
              <div className={calm ? "absolute inset-x-0 top-0 chest-card" : "absolute inset-x-0 top-0 chest-card [transform-style:preserve-3d]"}>
                <div
                  className="system-window flex flex-col items-center gap-2.5 p-4"
                  data-glow
                  style={{ "--primary": gradeColor } as CSSProperties}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <ItemMedal item={result.item} size={28} />
                    <GradeLabel grade={result.grade} />
                  </div>
                  <div className="flex min-h-[96px] items-center justify-center">
                    <ItemArt item={result.item} rank={rank} size={96} animated />
                  </div>
                  <h2 className="text-2xl font-bold leading-tight">{result.item.name}</h2>
                  <p className="tabular text-[11px] uppercase tracking-widest text-muted-foreground">{slotName(result.item)}</p>
                  <p className="text-sm text-muted-foreground">{result.item.blurb}</p>
                  {result.duplicate && (
                    <p className="tabular border px-3 py-1 text-xs uppercase tracking-widest" style={{ borderColor: gradeColor, color: gradeColor }}>
                      Duplicate, +{result.bonusXp} XP
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <p className="sr-only" aria-live="polite">
            {phase === "reveal" && result
              ? `${result.gradeName}: ${result.item.name}, ${slotName(result.item).toLowerCase()}.${result.duplicate ? ` Duplicate, ${result.bonusXp} XP.` : ""}`
              : ""}
          </p>

          <div className="flex w-full flex-col items-center gap-2 pb-2">
            {phase === "idle" && (
              <>
                <Button ref={mainButton} type="button" className="h-12 w-full text-sm" onClick={open}>
                  Open chest
                </Button>
                <p className="text-xs text-muted-foreground">
                  {chest.kind === "weekly" ? "A weekly chest has better odds for Rare items." : "Tap the chest or press Enter."}
                  {chest.daysLeft <= 2 && <span className="text-foreground"> {chest.daysLeft === 0 ? "Last day to open it." : `${chest.daysLeft} day${chest.daysLeft === 1 ? "" : "s"} left.`}</span>}
                </p>
                <Button type="button" variant="ghost" className="h-9" onClick={close}>
                  Not now
                </Button>
              </>
            )}

            {busy && (
              <p className={"tabular text-[11px] uppercase tracking-widest text-muted-foreground" + (waiting ? " motion-safe:animate-pulse" : "")}>
                {waiting ? "Opening" : "Tap to skip"}
              </p>
            )}

            {phase === "reveal" && result && (
              <>
                {!result.duplicate && !alreadyWorn && (
                  <Button type="button" variant="outline" className="h-11 w-full" onClick={equip} disabled={equipping}>
                    {equipping ? "Equipping" : replaced ? "Equip instead of what you wear" : "Equip"}
                  </Button>
                )}
                {!result.duplicate && alreadyWorn && <p className="tabular text-[11px] uppercase tracking-widest text-primary">Equipped</p>}
                {remaining > 0 ? (
                  <Button ref={mainButton} type="button" className="h-12 w-full" onClick={next}>
                    Open next chest ({remaining} left)
                  </Button>
                ) : (
                  <Button ref={mainButton} type="button" className="h-12 w-full" onClick={close}>
                    {SYSTEM.continue}
                  </Button>
                )}
                {remaining > 0 && (
                  <Button type="button" variant="ghost" className="h-9" onClick={close}>
                    Later
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
