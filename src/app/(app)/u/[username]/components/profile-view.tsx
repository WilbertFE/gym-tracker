import { format, parseISO } from "date-fns";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ItemPreview } from "@/components/chest/item-preview";
import { Panel } from "@/components/panel";
import { RankBadge } from "@/components/rank-badge";
import { StatsRadar } from "@/components/stats-radar";
import { getCurrentUserId } from "@/lib/auth";
import { GRADE_ORDER, GRADES, ITEMS, gradeRank, type FrameStyle } from "@/lib/items";
import type { PublicProfile, SectionId } from "@/lib/profile";
import { loadProfileView } from "@/lib/profile-view";
import { rankForLevel } from "@/lib/ranks";
import { TITLES } from "@/lib/titles";

/** Owners are told which sections others cannot see. */
function HiddenNote({ view, section }: { view: PublicProfile; section: SectionId }) {
  if (!view.isOwner || view.shared[section]) return null;
  return (
    <p className="tabular mb-3 border border-dashed px-2 py-1 text-[11px] uppercase tracking-widest text-muted-foreground">
      Hidden from others{view.visibility === "private" ? ", and so is the whole profile" : ""}
    </p>
  );
}

function Header({ view }: { view: PublicProfile }) {
  const worn = view.collection?.worn ?? {};
  const aura = worn.aura?.value;
  const style = aura ? ({ "--aura": aura } as CSSProperties) : undefined;
  const rank = view.level ? view.level.rank : null;

  return (
    <section aria-label="Player" className="system-window p-4 sm:p-6" data-glow style={style}>
      <div className="flex items-center gap-4 sm:gap-6">
        {rank ? (
          <RankBadge rank={rank} size={112} decor={(worn.frame?.value as FrameStyle | undefined) ?? null} />
        ) : (
          <span
            aria-hidden
            className="font-display flex size-24 shrink-0 items-center justify-center border border-primary/50 text-4xl font-bold text-primary"
          >
            {view.displayName.slice(0, 1).toUpperCase()}
          </span>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="tabular text-[11px] uppercase tracking-widest text-muted-foreground">@{view.username}</p>
          <h1 className="break-words text-3xl font-bold leading-tight">{view.displayName}</h1>
          {(worn.plate || view.level?.title) && (
            <p className="flex flex-wrap items-center gap-2">
              {worn.plate && (
                <span className="font-display border border-primary/50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-primary">
                  {worn.plate.value}
                </span>
              )}
              {view.level?.title && <span className="text-sm text-muted-foreground">{view.level.title}</span>}
            </p>
          )}
          {view.level && (
            <p className="tabular flex flex-wrap items-baseline gap-x-2">
              <span className="whitespace-nowrap text-[11px] uppercase tracking-widest text-muted-foreground">[ {view.level.rank.name} ]</span>
              <span className="text-sm text-muted-foreground">Level</span>
              <span className="text-3xl font-bold leading-none [text-shadow:0_0_18px_var(--aura,var(--primary))]">{view.level.level}</span>
            </p>
          )}
        </div>
      </div>
      {view.bio && <p className="mt-4 border-t pt-4 text-sm">{view.bio}</p>}
      {view.level && (
        <p className="tabular mt-3 text-xs text-muted-foreground">{view.level.xp.toLocaleString("en-US")} XP in total</p>
      )}
    </section>
  );
}

function Stats({ view }: { view: PublicProfile }) {
  if (!view.stats) return null;
  const ceiling = Math.max(60, Math.ceil((Math.max(...view.stats.map((s) => s.value)) * 1.2) / 10) * 10);
  return (
    <Panel label="Stats" variant="system">
      <HiddenNote view={view} section="stats" />
      <div className="grid items-center gap-4 sm:grid-cols-2">
        <ul className="flex flex-col divide-y">
          {view.stats.map((stat) => (
            <li key={stat.name} className="flex flex-col gap-1.5 py-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium">{stat.name}</p>
                <p className="tabular text-xl font-semibold leading-none">{stat.value}</p>
              </div>
              <div
                role="progressbar"
                aria-label={`${stat.name} ${stat.value}`}
                aria-valuemin={0}
                aria-valuemax={ceiling}
                aria-valuenow={Math.min(stat.value, ceiling)}
                className="h-1.5 w-full bg-intensity-none"
              >
                <div className="h-full bg-primary shadow-[0_0_10px_var(--primary)]" style={{ width: `${Math.min(100, (stat.value / ceiling) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
        <StatsRadar stats={view.stats} max={ceiling} />
      </div>
    </Panel>
  );
}

function Collection({ view }: { view: PublicProfile }) {
  if (!view.collection) return null;
  const { owned, worn } = view.collection;
  const wornIds = new Set(Object.values(worn).map((i) => i.id));
  const rank = view.level?.rank ?? rankForLevel(1);
  const sorted = [...owned].sort((a, b) => gradeRank(b.grade) - gradeRank(a.grade) || a.name.localeCompare(b.name));
  const perGrade = GRADE_ORDER.map((g) => ({ grade: g, have: owned.filter((i) => i.grade === g).length, total: ITEMS.filter((i) => i.grade === g).length }));

  return (
    <Panel label={`Collection, ${owned.length} of ${ITEMS.length}`} variant="system">
      <HiddenNote view={view} section="collection" />
      <ul className="mb-4 flex flex-wrap gap-2" aria-label="Items found by grade">
        {perGrade.map(({ grade, have, total }) => (
          <li
            key={grade}
            className="tabular border px-2 py-1 text-[11px] uppercase tracking-widest"
            style={{ borderColor: `${GRADES[grade].color}88`, color: GRADES[grade].color }}
          >
            {GRADES[grade].name} {have} / {total}
          </li>
        ))}
      </ul>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">No items found yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {sorted.map((item) => (
            <li key={item.id} className="flex flex-col items-center gap-1.5 border bg-surface p-3 text-center" style={{ borderColor: `${GRADES[item.grade].color}88` }}>
              <div className="flex h-[72px] items-center justify-center">
                <ItemPreview item={item} rank={rank} size={64} />
              </div>
              <p className="text-sm font-medium">{item.name}</p>
              <p className="tabular text-[10px] uppercase tracking-widest" style={{ color: GRADES[item.grade].color }}>
                {GRADES[item.grade].name}
                {wornIds.has(item.id) ? ", worn" : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Titles({ view }: { view: PublicProfile }) {
  if (!view.titles) return null;
  const earned = TITLES.filter((t) => view.titles!.includes(t.id));
  return (
    <Panel label="Titles" variant="plain">
      <HiddenNote view={view} section="titles" />
      {earned.length === 0 ? (
        <p className="text-sm text-muted-foreground">No titles earned yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {earned.map((t) => (
            <li key={t.id} className="border border-primary/50 px-2 py-1 text-sm" title={t.how}>
              {t.name}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Muscles({ view }: { view: PublicProfile }) {
  if (!view.muscles) return null;
  const sorted = [...view.muscles].sort((a, b) => b.level - a.level || b.weighted - a.weighted);
  return (
    <Panel label="Muscle levels" variant="plain">
      <HiddenNote view={view} section="muscles" />
      <ul className="grid gap-x-6 sm:grid-cols-2">
        {sorted.map((m) => (
          <li key={m.muscle} className="flex flex-col gap-1 border-b py-2">
            <div className="flex items-baseline justify-between gap-3">
              <p className={m.weighted === 0 ? "text-sm text-muted-foreground" : "text-sm"}>{m.label}</p>
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
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Activity({ view }: { view: PublicProfile }) {
  if (!view.activity) return null;
  const a = view.activity;
  const tiles: [string, string][] = [
    ["Workouts", a.workouts.toLocaleString("en-US")],
    ["Longest streak", `${a.longestStreak} day${a.longestStreak === 1 ? "" : "s"}`],
    ["Quests", a.questsCompleted.toLocaleString("en-US")],
    ["Gates cleared", a.gatesCleared.toLocaleString("en-US")],
    ["Lifted in total", `${a.volumeKg.toLocaleString("en-US")} kg`],
  ];
  return (
    <Panel label="Activity" variant="plain">
      <HiddenNote view={view} section="activity" />
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map(([name, value]) => (
          <div key={name} className="flex flex-col gap-0.5 border bg-surface px-3 py-2">
            <dt className="tabular text-[11px] uppercase tracking-widest text-muted-foreground">{name}</dt>
            <dd className="tabular text-lg font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      {a.firstDate && <p className="tabular mt-3 text-xs text-muted-foreground">Training since {format(parseISO(a.firstDate), "d MMM yyyy")}.</p>}
    </Panel>
  );
}

/**
 * A player's profile. The server has already cut it down to what the viewer may see (`loadProfileView`), so a
 * section that is hidden is simply not here. A private profile and one that does not exist look the same.
 */
export async function ProfileView({ username }: { username: string }) {
  const viewerId = await getCurrentUserId();
  const result = await loadProfileView(viewerId, username);

  if (result.status === "unavailable") {
    return (
      <Panel label="Profiles" variant="system">
        <p className="text-sm text-muted-foreground">Profiles are not set up yet. They appear as soon as the database is updated.</p>
      </Panel>
    );
  }
  if (result.status === "not_found") {
    return (
      <Panel label="Profile" variant="system">
        <h1 className="text-xl font-semibold">No profile here</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This profile does not exist, or its owner keeps it private. You can see who is on the{" "}
          <Link href="/leaderboard" className="underline underline-offset-4">
            leaderboard
          </Link>
          .
        </p>
      </Panel>
    );
  }

  const view = result.view;
  const anyShown = view.level || view.stats || view.collection || view.titles || view.muscles || view.activity;

  return (
    <div className="flex flex-col gap-6">
      {view.isOwner && (
        <div role="note" className="flex flex-col gap-2 border border-primary/50 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            This is your profile.{" "}
            {view.visibility === "members"
              ? "Other signed-in users can open it, and see the sections that are switched on."
              : "It is private, so only you can see it."}
          </p>
          <Link href="/settings#profile" className="font-display inline-flex min-h-11 shrink-0 items-center border border-primary px-4 text-sm font-semibold hover:bg-primary hover:text-primary-foreground">
            Edit profile
          </Link>
        </div>
      )}

      <Header view={view} />

      {!anyShown && (
        <Panel label="Private" variant="plain">
          <p className="text-sm text-muted-foreground">{view.displayName} keeps the rest of the profile private.</p>
        </Panel>
      )}

      <Stats view={view} />
      <Collection view={view} />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Titles view={view} />
        <Activity view={view} />
      </div>
      <Muscles view={view} />

      {view.updatedAt && (
        <p className="tabular text-xs text-muted-foreground">Updated {format(parseISO(view.updatedAt), "d MMM yyyy")}.</p>
      )}
    </div>
  );
}
