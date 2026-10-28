"use client";

import { format, parseISO } from "date-fns";
import { useMemo, useState } from "react";
import { SegmentedControl } from "@/components/segmented-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { compareProgress, describeSpan } from "@/lib/progress";
import type { BodyMeasurement, PhotoPose, ProgressPhoto, WeightLog } from "@/lib/types";
import { displayChange, displayWeight, type WeightUnit } from "@/lib/units";
import { PhotoImage } from "./photo-image";

type PhotoCompareProps = {
  photos: ProgressPhoto[];
  weights: WeightLog[];
  measurements: BodyMeasurement[];
  unit: WeightUnit;
};

const fmtDate = (d: string) => format(parseISO(d), "d MMM yyyy");
const signed = (n: number, digits = 1) => `${n > 0 ? "+" : ""}${n.toFixed(digits)}`;

/** Same pose, two dates, side by side, with the weight and measurement change between them. */
export function PhotoCompare({ photos, weights, measurements, unit }: PhotoCompareProps) {
  const firstPose = (["front", "side", "back"] as PhotoPose[]).find((p) =>
    photos.some((x) => x.pose === p),
  );
  const [pose, setPose] = useState<PhotoPose>(firstPose ?? "front");

  const ofPose = useMemo(
    () => photos.filter((p) => p.pose === pose).sort((a, b) => a.date.localeCompare(b.date)),
    [photos, pose],
  );

  // Chosen ids, falling back to oldest and newest when unset or no longer valid.
  const [chosen, setChosen] = useState<{ before?: string; after?: string }>({});
  const before = ofPose.find((p) => p.id === chosen.before) ?? ofPose[0] ?? null;
  const after = ofPose.find((p) => p.id === chosen.after) ?? ofPose[ofPose.length - 1] ?? null;

  const comparison =
    before && after && ofPose.length >= 2
      ? compareProgress({ beforeDate: before.date, afterDate: after.date, weights, measurements })
      : null;

  const options = ofPose.map((p) => ({ value: p.id, label: fmtDate(p.date) }));

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        label="Pose to compare"
        value={pose}
        onChange={(v) => {
          setPose(v);
          setChosen({});
        }}
        options={[
          { value: "front", label: "Front" },
          { value: "side", label: "Side" },
          { value: "back", label: "Back" },
        ]}
      />

      {ofPose.length < 2 || !before || !after ? (
        <p className="text-sm text-muted-foreground">
          Upload at least two {pose} photos from different dates to compare them.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            {([
              { key: "before", label: "Before", photo: before },
              { key: "after", label: "After", photo: after },
            ] as const).map(({ key, label, photo }) => (
              <div key={key} className="flex flex-col gap-2">
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</span>
                <Select value={photo.id} onValueChange={(id) => setChosen((c) => ({ ...c, [key]: id }))}>
                  <SelectTrigger className="h-11 w-full" aria-label={`${label} photo date`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <PhotoImage photo={photo} className="mx-auto w-full max-w-64" />
              </div>
            ))}
          </div>

          {comparison && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">Time apart</dt>
                <dd className="tabular text-lg">
                  {comparison.daysApart === 0 ? "Same day" : describeSpan(comparison.daysApart)}
                </dd>
              </div>
              {comparison.weight && (
                <div className="flex flex-col gap-1">
                  <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">Weight</dt>
                  <dd className="tabular text-lg">
                    {displayChange(comparison.weight.change, unit)} <span className="text-xs text-muted-foreground">{unit}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {displayWeight(comparison.weight.before, unit)} to {displayWeight(comparison.weight.after, unit)}
                    </span>
                  </dd>
                </div>
              )}
              {comparison.measurements.map((m) => (
                <div key={m.key} className="flex flex-col gap-1">
                  <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">{m.label}</dt>
                  <dd className="tabular text-lg">
                    {signed(m.change)} <span className="text-xs text-muted-foreground">{m.unit}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {m.before} to {m.after}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {comparison && !comparison.weight && comparison.measurements.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No weight or measurements were logged on or before both dates, so only the photos are compared.
            </p>
          )}
        </>
      )}
    </div>
  );
}
