import { Panel } from "@/components/panel";
import type { MuscleLevel } from "@/lib/muscle-levels";
import type { TitleStatus } from "@/lib/titles";
import { cn } from "@/lib/utils";

/** A level for every muscle, from the sets that worked it. Opens at level 15. */
export function MuscleLevels({ muscles }: { muscles: MuscleLevel[] }) {
  const sorted = [...muscles].sort((a, b) => b.level - a.level || b.weighted - a.weighted);
  return (
    <Panel label="Muscle levels" variant="system">
      <ul className="grid gap-x-6 sm:grid-cols-2">
        {sorted.map((m) => (
          <li key={m.muscle} className="flex flex-col gap-1 border-b py-2">
            <div className="flex items-baseline justify-between gap-3">
              <p className={cn("text-sm", m.weighted === 0 && "text-muted-foreground")}>{m.label}</p>
              <p className="tabular text-sm">Lv {m.level}</p>
            </div>
            <div
              role="progressbar"
              aria-label={`${m.label} level ${m.level}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(m.progress * 100)}
              className="h-1 w-full bg-intensity-none"
            >
              <div className="h-full bg-primary" style={{ width: `${Math.round(m.progress * 100)}%` }} />
            </div>
            <p className="tabular text-[11px] text-muted-foreground">
              {m.weighted === 0 ? "Not trained yet" : `${Math.ceil(m.toNext)} more sets to level ${m.level + 1}`}
            </p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** Every title and how to earn it, the worn one marked. Opens at level 10. */
export function Titles({ titles, worn }: { titles: TitleStatus[]; worn: string | null }) {
  return (
    <Panel label="Titles" variant="system">
      <p className="mb-3 text-sm text-muted-foreground">
        {worn ? (
          <>
            You wear <span className="text-primary">{worn}</span>, the most prestigious one you have earned.
          </>
        ) : (
          "Earn a title and it shows next to your nickname on the leaderboard."
        )}
      </p>
      <ul className="flex flex-col divide-y border">
        {titles.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-3 px-3 py-2">
            <div className="flex flex-col">
              <p className={cn("text-sm", !t.earned && "text-muted-foreground")}>{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.how}</p>
            </div>
            <span
              className={cn(
                "tabular shrink-0 border px-1.5 py-0.5 text-[10px] uppercase tracking-widest",
                t.earned ? "border-primary text-primary" : "text-muted-foreground",
              )}
            >
              {t.earned ? (t.name === worn ? "Worn" : "Earned") : "Locked"}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
