import "server-only";
import { todayISO } from "@/lib/dates";
import {
  currentWeekStart,
  entryXp,
  LEADERBOARD,
  type BoardPeriod,
  type BoardScope,
  type LeaderboardEntry,
} from "@/lib/leaderboard";
import { getEntry, listBoard, rankOf } from "@/lib/repositories/leaderboard";
import { visibleUsernames } from "@/lib/repositories/profiles";
import { getSettings } from "@/lib/repositories/settings";

/** A row as it is sent to the browser: no user id, just what everyone may see. */
export type PublicRow = {
  rank: number;
  display_name: string;
  country: string | null;
  level: number;
  title: string | null;
  plate: string | null;
  /** The username of a profile other people can open, or null when there is none to open. */
  username: string | null;
  xp: number;
  is_me: boolean;
};

export type Board = {
  scope: BoardScope;
  period: BoardPeriod;
  weekStart: string;
  /** Your country from Settings, or null. */
  country: string | null;
  /** You have joined the leaderboard. */
  joined: boolean;
  displayName: string | null;
  /** The top rows. */
  rows: PublicRow[];
  /** Your row and position on this board, also when you are outside the top rows. Null when not on it. */
  me: PublicRow | null;
  /** The board cannot be shown as asked, for example the country board with no country set. */
  problem: "no_country" | null;
};

const toRow = (
  entry: LeaderboardEntry,
  rank: number,
  period: BoardPeriod,
  weekStart: string,
  myId: string,
  usernames: Record<string, string>,
): PublicRow => ({
  rank,
  display_name: entry.display_name,
  country: entry.country,
  level: entry.level,
  title: entry.title,
  plate: entry.plate,
  username: usernames[entry.user_id] ?? null,
  xp: entryXp(entry, period, weekStart),
  is_me: entry.user_id === myId,
});

/** Everything the leaderboard page and the API need for one view. */
export async function buildBoard(userId: string, scope: BoardScope, period: BoardPeriod): Promise<Board> {
  const weekStart = currentWeekStart(todayISO());
  const [settings, mine] = await Promise.all([getSettings(userId), getEntry(userId)]);
  const base = {
    scope,
    period,
    weekStart,
    country: settings.country,
    joined: mine !== null,
    displayName: mine?.display_name ?? null,
  };

  if (scope === "country" && settings.country === null) {
    return { ...base, rows: [], me: null, problem: "no_country" };
  }

  const args = { scope, country: settings.country, period, weekStart };
  const entries = await listBoard({ ...args, limit: LEADERBOARD.top });
  // A row links to a profile only when that profile is open to other users.
  const usernames = await visibleUsernames([...entries.map((e) => e.user_id), userId]);
  const rows = entries.map((e, i) => toRow(e, i + 1, period, weekStart, userId, usernames));

  let me: PublicRow | null = rows.find((r) => r.is_me) ?? null;
  if (!me && mine) {
    const rank = await rankOf(userId, args);
    me = rank === null ? null : toRow(mine, rank, period, weekStart, userId, usernames);
  }
  return { ...base, rows, me, problem: null };
}
