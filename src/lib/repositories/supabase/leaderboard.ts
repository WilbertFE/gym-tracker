import "server-only";
import { entryXp, type BoardPeriod, type BoardScope, type EntryData, type LeaderboardEntry } from "@/lib/leaderboard";
import type { UpsertEntryResult } from "@/lib/repositories/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { check, getDb, isUniqueViolation, isUuid } from "./db";

const COLUMNS = "user_id,display_name,country,total_xp,week_xp,week_start,level,title,updated_at";
/** The columns that existed before titles, used until the title migration has run. */
const COLUMNS_NO_TITLE = "user_id,display_name,country,total_xp,week_xp,week_start,level,updated_at";

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
  updated_at: r.updated_at,
});

/** Postgres "undefined table" and PostgREST "not in the schema cache": the migration has not run yet. */
const isMissingTable = (error: { code?: string } | null) => error?.code === "42P01" || error?.code === "PGRST205";

/** Postgres "undefined column" and PostgREST "column not in the schema cache": the title migration has not run yet. */
const isMissingColumn = (error: { code?: string } | null) => error?.code === "42703" || error?.code === "PGRST204";

type BoardArgs = { scope: BoardScope; country: string | null; period: BoardPeriod; weekStart: string };

/** The column a period is ranked by. */
const xpColumn = (period: BoardPeriod) => (period === "week" ? "week_xp" : "total_xp");

/** Reads use the signed in user's client: the row level security policy lets every signed in user read the board. */
export async function listBoard(args: BoardArgs & { limit: number }): Promise<LeaderboardEntry[]> {
  const db = await getDb();
  let query = db.from("leaderboard_entries").select(COLUMNS);
  if (args.scope === "country") {
    if (args.country === null) return [];
    query = query.eq("country", args.country);
  }
  if (args.period === "week") query = query.eq("week_start", args.weekStart).gt("week_xp", 0);
  const { data, error } = await query
    .order(xpColumn(args.period), { ascending: false })
    .order("updated_at", { ascending: true })
    .order("display_name", { ascending: true })
    .limit(args.limit);
  if (isMissingColumn(error)) return listBoardWithoutTitle(args);
  // Until the migration has run there is simply nobody on the board.
  if (isMissingTable(error)) return [];
  check(error);
  return (data ?? []).map(toEntry);
}

/** The same list before the title column exists. */
async function listBoardWithoutTitle(args: BoardArgs & { limit: number }): Promise<LeaderboardEntry[]> {
  const db = await getDb();
  let query = db.from("leaderboard_entries").select(COLUMNS_NO_TITLE);
  if (args.scope === "country") query = query.eq("country", args.country!);
  if (args.period === "week") query = query.eq("week_start", args.weekStart).gt("week_xp", 0);
  const { data, error } = await query
    .order(xpColumn(args.period), { ascending: false })
    .order("updated_at", { ascending: true })
    .order("display_name", { ascending: true })
    .limit(args.limit);
  check(error);
  return (data ?? []).map(toEntry);
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
  const { data, error } = await db.from("leaderboard_entries").select(COLUMNS).eq("user_id", userId).maybeSingle();
  if (isMissingColumn(error)) {
    const old = await db.from("leaderboard_entries").select(COLUMNS_NO_TITLE).eq("user_id", userId).maybeSingle();
    check(old.error);
    return old.data ? toEntry(old.data) : null;
  }
  if (isMissingTable(error)) return null;
  check(error);
  return data ? toEntry(data) : null;
}

/** Writes use the service role client, the only place in the app that does. Nothing else can change a row. */
export async function upsertEntry(userId: string, data: EntryData): Promise<UpsertEntryResult> {
  if (!isUuid(userId)) return { ok: false, reason: "name_taken" };
  const admin = createAdminClient();
  const existing = await getEntry(userId);
  const unchanged = existing && existing.total_xp === data.total_xp && existing.week_xp === data.week_xp;

  const values = { user_id: userId, ...data, updated_at: unchanged ? existing.updated_at : new Date().toISOString() };
  let { data: row, error } = await admin.from("leaderboard_entries").upsert(values, { onConflict: "user_id" }).select(COLUMNS).single();
  if (isMissingColumn(error)) {
    // The title column is not there yet: save everything else, the title waits for the migration.
    const { title: _title, ...withoutTitle } = values;
    void _title;
    ({ data: row, error } = await admin
      .from("leaderboard_entries")
      .upsert(withoutTitle, { onConflict: "user_id" })
      .select(COLUMNS_NO_TITLE)
      .single());
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
