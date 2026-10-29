import "server-only";
import { entryXp, type BoardPeriod, type BoardScope, type EntryData, type LeaderboardEntry } from "@/lib/leaderboard";
import type { UpsertEntryResult } from "@/lib/repositories/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { check, getDb, isUniqueViolation, isUuid } from "./db";

const BASE = "user_id,display_name,country,total_xp,week_xp,week_start,level,updated_at";
/**
 * The columns to ask for, newest first. Each step adds a column from a later migration (titles, then
 * nameplates), so until a migration has run the step before it is used and the rest of the board still works.
 */
const COLUMN_STEPS: readonly string[] = [`${BASE},title,plate`, `${BASE},title`, BASE];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toEntry = (r: any): LeaderboardEntry => ({
  user_id: r.user_id,
  display_name: r.display_name,
  country: r.country,
  total_xp: Number(r.total_xp),
  week_xp: Number(r.week_xp),
  week_start: r.week_start,
  level: Number(r.level),
  title: r.title ?? null,
  plate: r.plate ?? null,
  updated_at: r.updated_at,
});

/** Postgres "undefined table" and PostgREST "not in the schema cache": the migration has not run yet. */
const isMissingTable = (error: { code?: string } | null) => error?.code === "42P01" || error?.code === "PGRST205";

/** Postgres "undefined column" and PostgREST "column not in the schema cache": a later migration has not run yet. */
const isMissingColumn = (error: { code?: string } | null) => error?.code === "42703" || error?.code === "PGRST204";

type BoardArgs = { scope: BoardScope; country: string | null; period: BoardPeriod; weekStart: string };

/** The column a period is ranked by. */
const xpColumn = (period: BoardPeriod) => (period === "week" ? "week_xp" : "total_xp");

/** Reads use the signed in user's client: the row level security policy lets every signed in user read the board. */
export async function listBoard(args: BoardArgs & { limit: number }): Promise<LeaderboardEntry[]> {
  if (args.scope === "country" && args.country === null) return [];
  const db = await getDb();
  for (const columns of COLUMN_STEPS) {
    let query = db.from("leaderboard_entries").select(columns);
    if (args.scope === "country") query = query.eq("country", args.country!);
    if (args.period === "week") query = query.eq("week_start", args.weekStart).gt("week_xp", 0);
    const { data, error } = await query
      .order(xpColumn(args.period), { ascending: false })
      .order("updated_at", { ascending: true })
      .order("display_name", { ascending: true })
      .limit(args.limit);
    if (isMissingColumn(error)) continue;
    // Until the migration has run there is simply nobody on the board.
    if (isMissingTable(error)) return [];
    check(error);
    return (data ?? []).map(toEntry);
  }
  return [];
}

/** Position of a user: the rows ahead of them plus one, with the same tie rule as the list. */
export async function rankOf(userId: string, args: BoardArgs): Promise<number | null> {
  const mine = await getEntry(userId);
  if (!mine) return null;
  if (args.scope === "country" && (args.country === null || mine.country !== args.country)) return null;
  const xp = entryXp(mine, args.period, args.weekStart);
  if (args.period === "week" && xp <= 0) return null;

  const column = xpColumn(args.period);
  const db = await getDb();
  let query = db.from("leaderboard_entries").select("user_id", { count: "exact", head: true });
  if (args.scope === "country") query = query.eq("country", args.country!);
  if (args.period === "week") query = query.eq("week_start", args.weekStart);
  // Names are limited to letters, digits, spaces, dots, dashes and underscores, so none of these
  // characters can break the filter, and the quotes keep spaces intact.
  const name = `"${mine.display_name}"`;
  const { count, error } = await query.or(
    `${column}.gt.${xp},and(${column}.eq.${xp},updated_at.lt.${mine.updated_at}),` +
      `and(${column}.eq.${xp},updated_at.eq.${mine.updated_at},display_name.lt.${name})`,
  );
  if (isMissingTable(error)) return null;
  check(error);
  return (count ?? 0) + 1;
}

export async function getEntry(userId: string): Promise<LeaderboardEntry | null> {
  if (!isUuid(userId)) return null;
  const db = await getDb();
  for (const columns of COLUMN_STEPS) {
    const { data, error } = await db.from("leaderboard_entries").select(columns).eq("user_id", userId).maybeSingle();
    if (isMissingColumn(error)) continue;
    if (isMissingTable(error)) return null;
    check(error);
    return data ? toEntry(data) : null;
  }
  return null;
}

/** Writes use the service role client, the only place in the app that does. Nothing else can change a row. */
export async function upsertEntry(userId: string, data: EntryData): Promise<UpsertEntryResult> {
  if (!isUuid(userId)) return { ok: false, reason: "name_taken" };
  const admin = createAdminClient();
  const existing = await getEntry(userId);
  const unchanged = existing && existing.total_xp === data.total_xp && existing.week_xp === data.week_xp;

  const { plate, title, ...rest } = data;
  const base = { user_id: userId, ...rest, updated_at: unchanged ? existing.updated_at : new Date().toISOString() };
  // The same steps as the reads: a column whose migration has not run is left out, the rest still saves.
  const attempts: [Record<string, unknown>, string][] = [
    [{ ...base, title, plate }, COLUMN_STEPS[0]],
    [{ ...base, title }, COLUMN_STEPS[1]],
    [base, COLUMN_STEPS[2]],
  ];
  let row: unknown = null;
  let error: { code?: string; message: string } | null = null;
  for (const [values, columns] of attempts) {
    const result = await admin.from("leaderboard_entries").upsert(values, { onConflict: "user_id" }).select(columns).single();
    row = result.data;
    error = result.error;
    if (!isMissingColumn(error)) break;
  }
  if (isUniqueViolation(error)) return { ok: false, reason: "name_taken" };
  if (isMissingTable(error)) throw new Error("The leaderboard table does not exist yet. Run supabase/migrations/20261028000400_leaderboard.sql.");
  check(error);
  return { ok: true, entry: toEntry(row) };
}

export async function deleteEntry(userId: string): Promise<boolean> {
  if (!isUuid(userId)) return false;
  const admin = createAdminClient();
  const { data, error } = await admin.from("leaderboard_entries").delete().eq("user_id", userId).select("user_id");
  check(error);
  return (data?.length ?? 0) > 0;
}
