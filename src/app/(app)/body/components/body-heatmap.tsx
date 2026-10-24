"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { SegmentedControl } from "@/components/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import {
  INTENSITY_CONFIG,
  type IntensityLevel,
  type MuscleStat,
  type Period,
} from "@/lib/muscle-intensity";
import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/muscles";
import { BodySvg } from "./body-svg";
import { viewFor, type BodyView } from "./body-shapes";
import { LEVEL_DOT, MuscleDetail } from "./muscle-detail";
import { MuscleList } from "./muscle-list";
import { cn } from "@/lib/utils";

// The 3D canvas is heavy and WebGL only, so load it on demand in the browser.
const Body3D = dynamic(() => import("./body-3d"), {
  ssr: false,
  loading: () => <Skeleton className="h-[26rem] w-full" />,
});

type View = BodyView | "3d";

const LEVELS: IntensityLevel[] = ["none", "low", "mid", "high"];

export function BodyHeatmap({ stats }: { stats: MuscleStat[] }) {
  const [period, setPeriod] = useState<Period>("weekly");
  const [view, setView] = useState<View>("front");
  const [selected, setSelected] = useState<MuscleGroup | null>(null);

  const levels = useMemo(
    () =>
      Object.fromEntries(stats.map((s) => [s.muscle, s[period].level])) as Record<MuscleGroup, IntensityLevel>,
    [stats, period],
  );
  const scores = useMemo(
    () => Object.fromEntries(stats.map((s) => [s.muscle, s[period].score])) as Record<MuscleGroup, number>,
    [stats, period],
  );
  const selectedStat = stats.find((s) => s.muscle === selected) ?? null;

  // Picking from the list also turns the 2D figure to the side where it is visible.
  function selectFromList(muscle: MuscleGroup) {
    setSelected(muscle);
    if (view !== "3d") setView(viewFor(muscle));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl
            label="Period"
            value={period}
            onChange={setPeriod}
            options={[
              { value: "weekly", label: "Weekly" },
              { value: "overall", label: "Overall" },
            ]}
          />
          <SegmentedControl
            label="View"
            value={view}
            onChange={setView}
            options={[
              { value: "front", label: "Front" },
              { value: "back", label: "Back" },
              { value: "3d", label: "3D" },
            ]}
          />
        </div>

        <div className="relative border bg-background p-4 [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:24px_24px]">
          {/* Corner brackets */}
          {[
            "left-1 top-1 border-l border-t",
            "right-1 top-1 border-r border-t",
            "bottom-1 left-1 border-b border-l",
            "bottom-1 right-1 border-b border-r",
          ].map((pos) => (
            <span key={pos} className={cn("pointer-events-none absolute size-4 border-primary", pos)} aria-hidden />
          ))}

          {view === "3d" ? (
            <Body3D levels={levels} selected={selected} onSelect={setSelected} />
          ) : (
            <BodySvg view={view} levels={levels} scores={scores} selected={selected} onSelect={setSelected} />
          )}
        </div>

        <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Legend">
          {LEVELS.map((level) => (
            <li key={level} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={cn("size-2 rounded-full", LEVEL_DOT[level])} aria-hidden />
              {INTENSITY_CONFIG.labels[level]}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          {period === "weekly"
            ? "Weekly: weighted sets this week. Primary sets count 1, secondary sets count 0.5."
            : "Overall: all time, relative to your most trained muscle."}
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <MuscleDetail stat={selectedStat} period={period} />
        <MuscleList
          stats={MUSCLE_GROUPS.map((m) => stats.find((s) => s.muscle === m)!)}
          period={period}
          selected={selected}
          onSelect={selectFromList}
        />
      </div>
    </div>
  );
}
