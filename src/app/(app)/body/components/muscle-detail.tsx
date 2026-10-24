import { formatScore, INTENSITY_CONFIG, type MuscleStat, type Period } from "@/lib/muscle-intensity";
import { MUSCLE_LABELS } from "@/lib/muscles";
import { cn } from "@/lib/utils";

export const LEVEL_DOT = {
  none: "bg-intensity-none",
  low: "bg-intensity-low",
  mid: "bg-intensity-mid",
  high: "bg-intensity-high",
} as const;


function lastTrainedText(days: number | null) {
  if (days === null) return "Never";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

type MuscleDetailProps = {
  stat: MuscleStat | null;
  period: Period;
};

export function MuscleDetail({ stat, period }: MuscleDetailProps) {
  if (!stat) {
    return (
      <p className="text-sm text-muted-foreground">
        Tap a muscle on the body, or pick one from the list, to see its sets, last trained date and
        suggested exercises.
      </p>
    );
  }

  const current = stat[period];
  const periodLabel = period === "weekly" ? "This week" : "All time";

  return (
    <div className="flex flex-col gap-4" aria-live="polite">
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-semibold">{MUSCLE_LABELS[stat.muscle]}</h3>
        <p className="flex items-center gap-2 text-sm">
          <span className={cn("size-2 rounded-full", LEVEL_DOT[current.level])} aria-hidden />
          {INTENSITY_CONFIG.labels[current.level]}
        </p>
        <p className="text-xs text-muted-foreground">{INTENSITY_CONFIG.hints[current.level]}</p>
      </div>

      <dl className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1">
          <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">Weekly sets</dt>
          <dd className="tabular text-2xl">{formatScore(stat.weekly.score)}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">All time</dt>
          <dd className="tabular text-2xl">{formatScore(stat.overall.score)}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">Last trained</dt>
          <dd className="tabular text-sm leading-8">{lastTrainedText(stat.lastTrainedDaysAgo)}</dd>
        </div>
      </dl>

      <section>
        <h4 className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">
          {periodLabel}: top exercises
        </h4>
        {current.topExercises.length === 0 ? (
          <p className="text-sm text-muted-foreground">None logged.</p>
        ) : (
          <ul className="flex flex-col divide-y border">
            {current.topExercises.map((e) => (
              <li key={e.name} className="flex min-h-11 items-center justify-between px-3 text-sm">
                <span>{e.name}</span>
                <span className="tabular text-xs text-muted-foreground">{e.sets} sets</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h4 className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">
          Suggested exercises
        </h4>
        <ul className="flex flex-col divide-y border">
          {stat.suggestions.map((name) => (
            <li key={name} className="flex min-h-11 items-center px-3 text-sm">
              {name}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
