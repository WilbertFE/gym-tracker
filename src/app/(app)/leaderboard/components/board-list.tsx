import { Panel } from "@/components/panel";
import { RankBadge } from "@/components/rank-badge";
import { countryName } from "@/lib/countries";
import type { PublicRow } from "@/lib/leaderboard-board";
import { rankForLevel } from "@/lib/ranks";
import { cn } from "@/lib/utils";

function Row({ row, pinned = false }: { row: PublicRow; pinned?: boolean }) {
  const podium = row.rank <= 3;
  return (
    <li
      aria-current={row.is_me ? "true" : undefined}
      className={cn(
        "flex items-center gap-3 px-3 py-2",
        row.is_me && "bg-surface-raised",
        pinned && "border-t-2 border-primary",
      )}
    >
      <span
        className={cn(
          "tabular w-10 shrink-0 text-right text-lg",
          podium ? "font-semibold text-primary" : "text-muted-foreground",
        )}
      >
        {row.rank}
      </span>
      <RankBadge rank={rankForLevel(row.level)} size={40} />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-sm font-medium">
          {row.display_name}
          {row.is_me && (
            <span className="tabular ml-2 border border-primary px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-primary">
              You
            </span>
          )}
        </p>
        <p className="tabular truncate text-[11px] uppercase tracking-widest text-muted-foreground">
          {row.country ? `${row.country}, ${countryName(row.country)}` : "No country"}
        </p>
      </div>
      <div className="tabular shrink-0 text-right">
        <p className="text-sm">{row.xp.toLocaleString("en-US")} XP</p>
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Level {row.level}</p>
      </div>
    </li>
  );
}

export function BoardList({
  rows,
  me,
  joined,
  label,
  note,
}: {
  rows: PublicRow[];
  me: PublicRow | null;
  joined: boolean;
  label: string;
  note: string;
}) {
  const meInList = me !== null && rows.some((r) => r.is_me);

  return (
    <Panel label={label}>
      <p className="mb-3 text-xs text-muted-foreground">{note}</p>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No one is on this board yet. {joined ? "Earn some XP and you will be first." : "Join above and be the first."}
        </p>
      ) : (
        <ol className="flex flex-col divide-y border" aria-label={label}>
          {rows.map((row) => (
            <Row key={`${row.rank}-${row.display_name}`} row={row} />
          ))}
          {me && !meInList && <Row row={me} pinned />}
        </ol>
      )}

      {joined && !me && rows.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">You are not on this board yet.</p>
      )}
    </Panel>
  );
}
