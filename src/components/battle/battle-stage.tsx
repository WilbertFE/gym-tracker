"use client";

import { FastForwardIcon, PauseIcon, PlayIcon, SkipForwardIcon, ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { describeTurn, type Battle } from "@/lib/battle/engine";
import type { Equipment } from "@/lib/items";
import { useReducedMotion } from "@/components/mascot/typed-text";
import { MUSCLE_LABELS, type MuscleGroup } from "@/lib/muscles";
import { HEAL_SHARE_PER_DAY, IDLE_DAYS_BEFORE_HEAL, WEAK_POINT_BONUS } from "@/lib/gates";
import type { Rank } from "@/lib/ranks";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { HeroFigure, type HeroState } from "./hero-art";
import { MonsterArt, type MonsterState } from "./monster-art";

type Phase = "idle" | "hero" | "impact" | "monster";

type BattleStageProps = {
  battle: Battle;
  rank: Rank;
  equipment: Equipment;
  /** The gate's rank letter and name, for the heading and the summary. */
  gateName: string;
};

const SPEEDS = [1, 2, 4] as const;
/** How long each part of a turn takes at normal speed, in milliseconds. */
const GAP_MS = 350;
const SWING_MS = 320;
const IMPACT_MS = 480;
const STRIKE_MS = 520;

const bar = "h-3 w-full overflow-hidden bg-intensity-none";

/**
 * The gate fight, played turn by turn: your hero swings at the monster for each set of the week, in order, and the
 * monster answers. Tap Skip to see where it ended. With reduced motion it opens at the end and shows only the log.
 */
export function BattleStage({ battle, rank, equipment, gateName }: BattleStageProps) {
  const reduced = useReducedMotion();
  const total = battle.turns.length;
  const [shown, setShown] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [playing, setPlaying] = useState(true);
  const [speedIndex, setSpeedIndex] = useState(0);
  const speed = SPEEDS[speedIndex];
  const first = useRef(true);

  // The figures grow with the stage: about half its width each, from a phone up to a wide screen.
  const stageRef = useRef<HTMLDivElement>(null);
  const [figure, setFigure] = useState(190);
  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const measure = () => setFigure(Math.max(130, Math.min(300, Math.round(node.clientWidth * 0.5))));
    measure();
    // An old browser without a resize observer keeps the size it measured once.
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Reduced motion: show where it ended, with nothing moving.
  const done = reduced ? total : shown;
  const turn = done > 0 ? battle.turns[done - 1] : null;
  const monsterHp = turn ? turn.monsterHp : battle.monsterHpMax;
  const fallen = turn !== null && turn.monsterHp === 0;
  const prevStamina = done > 1 ? battle.turns[done - 2].stamina : battle.hero.staminaMax;
  const stamina = turn ? (phase === "monster" && !reduced ? prevStamina : turn.stamina) : battle.hero.staminaMax;
  const atEnd = done >= total;

  const apply = useCallback(
    (index: number) => {
      const t = battle.turns[index];
      setShown(index + 1);
      playSound(t.monsterHp === 0 && (index === 0 || battle.turns[index - 1].monsterHp > 0) ? "victory" : t.crit ? "crit" : "hit");
    },
    [battle.turns],
  );

  // One turn is a few short steps: a pause, the swing, the impact, and the monster's answer.
  useEffect(() => {
    if (reduced || !playing || (atEnd && phase === "idle")) return;
    const wait = (ms: number, then: () => void) => {
      const timer = setTimeout(then, ms / speed);
      return () => clearTimeout(timer);
    };
    if (phase === "idle") {
      return wait(first.current ? 900 : GAP_MS, () => {
        first.current = false;
        setPhase("hero");
      });
    }
    if (phase === "hero") {
      return wait(SWING_MS, () => {
        apply(shown);
        setPhase("impact");
      });
    }
    if (phase === "impact") {
      const struck = battle.turns[shown - 1]?.strike != null;
      return wait(IMPACT_MS, () => {
        if (struck) playSound("monsterStrike");
        setPhase(struck ? "monster" : "idle");
      });
    }
    return wait(STRIKE_MS, () => setPhase("idle"));
  }, [reduced, playing, phase, shown, atEnd, speed, apply, battle.turns]);

  function skip() {
    setPhase("idle");
    setShown(total);
    setPlaying(false);
  }

  function restart() {
    first.current = true;
    setPhase("idle");
    setShown(0);
    setPlaying(true);
  }

  function step() {
    if (atEnd || phase !== "idle") return;
    setPlaying(false);
    setPhase("hero");
    // A single step plays its own parts and then stops on its own, because the effect above only runs while playing.
    setTimeout(() => {
      apply(shown);
      setPhase("impact");
      setTimeout(() => setPhase("idle"), IMPACT_MS);
    }, SWING_MS);
  }

  const heroState: HeroState = fallen && atEnd ? "win" : phase === "hero" ? "attack" : phase === "monster" ? "hurt" : "idle";
  const monsterState: MonsterState = fallen && (phase !== "hero") ? "down" : phase === "impact" ? "hit" : phase === "monster" ? "strike" : "idle";
  const hpPct = Math.round((monsterHp / battle.monsterHpMax) * 100);
  const staminaPct = Math.round((stamina / battle.hero.staminaMax) * 100);
  const log = battle.turns.slice(0, done);
  const { power } = battle.hero;

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="The fight" className="system-window flex flex-col gap-4 p-4" data-glow>
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em]">{gateName}</p>
          <p className="tabular text-[11px] uppercase tracking-widest text-muted-foreground">
            Set {done} of {total}
          </p>
        </div>

        {/* The stage: your hero on the left, the monster on the right. */}
        <div ref={stageRef} className="relative mx-auto flex w-full max-w-2xl items-end justify-between gap-2 overflow-hidden border border-primary/25 bg-[radial-gradient(ellipse_at_50%_100%,color-mix(in_srgb,var(--primary)_14%,transparent),transparent_70%)] px-2 pb-2 pt-10">
          <div className="relative">
            <HeroFigure rank={rank} equipment={equipment} state={heroState} size={figure} />
          </div>
          <div className="relative">
            {turn && phase === "impact" && (
              <span
                key={turn.n}
                aria-hidden
                className={cn("battle-float tabular absolute left-1/2 top-0 z-10 -translate-x-1/2 text-2xl font-bold", turn.crit ? "text-[#ffb83d]" : "text-foreground")}
              >
                {turn.crit ? "CRIT " : ""}-{turn.damage.toLocaleString("en-US")}
              </span>
            )}
            <MonsterArt monster={battle.monster.id} state={monsterState} hp={monsterHp / battle.monsterHpMax} size={figure} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <p className="tabular flex justify-between text-xs">
              <span className="uppercase tracking-widest text-muted-foreground">You</span>
              <span>
                {stamina} / {battle.hero.staminaMax} stamina
              </span>
            </p>
            <div role="progressbar" aria-label={`Your stamina, ${staminaPct} percent`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={staminaPct} className={bar}>
              <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${staminaPct}%` }} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <p className="tabular flex justify-between text-xs">
              <span className="uppercase tracking-widest text-muted-foreground">{battle.monster.name}</span>
              <span>{monsterHp.toLocaleString("en-US")} HP</span>
            </p>
            <div role="progressbar" aria-label={`${battle.monster.name}, ${hpPct} percent left`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={hpPct} className={bar}>
              <div className="h-full bg-intensity-high shadow-[0_0_10px_var(--intensity-high)] transition-[width] duration-500" style={{ width: `${hpPct}%` }} />
            </div>
          </div>
        </div>

        {!reduced && (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Playback">
            <Button type="button" variant="outline" className="h-11" onClick={() => setPlaying((p) => !p)} disabled={atEnd && phase === "idle"} aria-label={playing && !atEnd ? "Pause" : "Play"}>
              {playing && !atEnd ? <PauseIcon className="size-4" aria-hidden /> : <PlayIcon className="size-4" aria-hidden />}
              {playing && !atEnd ? "Pause" : "Play"}
            </Button>
            <Button type="button" variant="outline" className="h-11" onClick={step} disabled={atEnd || phase !== "idle"}>
              <SkipForwardIcon className="size-4" aria-hidden />
              Next set
            </Button>
            <Button type="button" variant="outline" className="h-11" onClick={() => setSpeedIndex((i) => (i + 1) % SPEEDS.length)} aria-label={`Speed ${speed} times, tap to change`}>
              <FastForwardIcon className="size-4" aria-hidden />
              {speed}x
            </Button>
            <Button type="button" variant="outline" className="h-11" onClick={skip} disabled={atEnd}>
              Skip to the end
            </Button>
            <Button type="button" variant="ghost" className="h-11" onClick={restart}>
              <ArrowCounterClockwiseIcon className="size-4" aria-hidden />
              Replay
            </Button>
          </div>
        )}

        {atEnd && (
          <p role="status" className="tabular border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
            {battle.defeatedAt !== null
              ? `The ${battle.monster.name} fell on set ${battle.defeatedAt}. ${battle.totalDamage.toLocaleString("en-US")} damage in all.`
              : total === 0
                ? `No sets logged this week yet. The ${battle.monster.name} waits.`
                : `The ${battle.monster.name} still stands with ${monsterHp.toLocaleString("en-US")} HP. ${battle.totalDamage.toLocaleString("en-US")} damage so far.`}
          </p>
        )}
      </section>

      <section aria-label="What you bring" className="system-window flex flex-col gap-2 p-4">
        <h2 className="font-display text-xs font-semibold uppercase tracking-[0.2em]">What you bring this week</h2>
        <p className="text-xs text-muted-foreground">
          Your stats from the training before this week. Strength makes every set hit harder and Agility gives critical hits. Endurance, Vitality and Discipline decide how you stand up to the {battle.monster.name}.
        </p>
        <p className="text-xs">
          <span className="uppercase tracking-widest text-muted-foreground">This week&apos;s weak point </span>
          {MUSCLE_LABELS[battle.weakMuscle as MuscleGroup]}: a set that trains it deals {Math.round(WEAK_POINT_BONUS * 100)} percent more.
        </p>
        <p className="text-xs text-muted-foreground">
          If you skip {IDLE_DAYS_BEFORE_HEAL} days in a row the {battle.monster.name} starts to recover {Math.round(HEAL_SHARE_PER_DAY * 100)} percent of its HP a day.
        </p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Damage</dt>
            <dd className="tabular">+{Math.round((power.attack - 1) * 100)}%</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Critical hits</dt>
            <dd className="tabular">{Math.round(power.critChance * 100)}%</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Stamina</dt>
            <dd className="tabular">{battle.hero.staminaMax}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Blocks</dt>
            <dd className="tabular">{Math.round(battle.hero.block * 100)}%</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Rests back</dt>
            <dd className="tabular">{Math.round(battle.hero.regen * 100)}% a day</dd>
          </div>
        </dl>
      </section>

      <section aria-label="The log" className="system-window flex flex-col gap-2 p-4">
        <h2 className="font-display text-xs font-semibold uppercase tracking-[0.2em]">Battle log</h2>
        {log.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet. Each set you log is a hit.</p>
        ) : (
          <ol className="flex max-h-80 flex-col-reverse divide-y divide-y-reverse overflow-y-auto border">
            {log.map((t) => (
              <li key={t.n} className="flex items-start gap-3 px-3 py-2 text-sm">
                <span className="tabular w-7 shrink-0 text-xs text-muted-foreground">{t.n}</span>
                <span className={cn(t.crit && "text-[#ffb83d]", t.weak && !t.crit && "text-primary")}>{describeTurn(t, battle.monster)}</span>
              </li>
            ))}
          </ol>
        )}
        <p className="sr-only" aria-live="polite">
          {turn ? describeTurn(turn, battle.monster) : ""}
        </p>
      </section>
    </div>
  );
}
