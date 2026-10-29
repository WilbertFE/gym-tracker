import "server-only";
import { todayISO } from "@/lib/dates";
import {
  currentWeekStart,
  positionOf,
  rankRows,
  type BoardPeriod,
  type BoardScope,
  type EntryData,
  type LeaderboardEntry,
} from "@/lib/leaderboard";
import type { UpsertEntryResult } from "@/lib/repositories/types";

/** One board for everyone, unlike the per user stores next to it. Demo mode only. */
const g = globalThis as unknown as { __gymBoard?: LeaderboardEntry[] };

/** Sample players so the board has something on it in demo mode. Never used with a real database. */
function samples(): LeaderboardEntry[] {
  const week = currentWeekStart(todayISO());
  const rows: [string, string, number, number, number][] = [
    ["Ayu Pratama", "ID", 5200, 310, 62],
    ["Budi Santoso", "ID", 3100, 120, 48],
    ["Citra Lestari", "ID", 900, 150, 24],
    ["Dimas Wijaya", "ID", 240, 40, 12],
    ["Jordan Reyes", "US", 7800, 280, 76],
    ["Sam Carter", "US", 1500, 90, 32],
    ["Mia Hoffmann", "DE", 4400, 220, 55],
    ["Lukas Brandt", "DE", 600, 0, 20],
    ["Yuki Tanaka", "JP", 2600, 180, 44],
    ["Aiko Mori", "JP", 150, 60, 9],
    ["Priya Nair", "IN", 3500, 200, 50],
    ["Arjun Rao", "IN", 80, 80, 6],
    ["Noah Smith", "GB", 1200, 30, 29],
    ["Emma Dupont", "FR", 2000, 140, 38],
    ["Lena Berg", "SE", 330, 0, 14],
  ];
  return rows.map(([display_name, country, total_xp, week_xp, level], i) => ({
    user_id: `sample-${i}`,
    display_name,
    country,
    total_xp,
    week_xp,
    week_start: week,
    level,
    title: level >= 60 ? "Iron Regular" : null,
    plate: level >= 70 ? "Ascendant" : level >= 50 ? "Grinder" : null,
    updated_at: new Date(Date.UTC(2026, 9, 1, 0, i)).toISOString(),
  }));
}

const rows = () => (g.__gymBoard ??= samples());

/** Test helper: back to the sample players. */
export function resetLeaderboard() {
  g.__gymBoard = undefined;
}

type BoardArgs = { scope: BoardScope; country: string | null; period: BoardPeriod; weekStart: string };

const inScope = (all: LeaderboardEntry[], { scope, country }: BoardArgs) =>
  scope === "country" ? all.filter((r) => country !== null && r.country === country) : all;

export async function listBoard(args: BoardArgs & { limit: number }): Promise<LeaderboardEntry[]> {
  return rankRows(inScope(rows(), args), args.period, args.weekStart).slice(0, args.limit);
}

export async function rankOf(userId: string, args: BoardArgs): Promise<number | null> {
  return positionOf(rankRows(inScope(rows(), args), args.period, args.weekStart), userId);
}

/** Whether another user's leaderboard entry already has this name, whatever the capitals. */
export function nameTakenOnBoard(name: string, exceptUserId: string): boolean {
  const wanted = name.toLowerCase();
  return rows().some((r) => r.user_id !== exceptUserId && r.display_name.toLowerCase() === wanted);
}

export async function getEntry(userId: string): Promise<LeaderboardEntry | null> {
  return rows().find((r) => r.user_id === userId) ?? null;
}

export async function upsertEntry(userId: string, data: EntryData): Promise<UpsertEntryResult> {
  const all = rows();
  if (all.some((r) => r.user_id !== userId && r.display_name.toLowerCase() === data.display_name.toLowerCase())) {
    return { ok: false, reason: "name_taken" };
  }
  const existing = all.find((r) => r.user_id === userId);
  const entry: LeaderboardEntry = {
    user_id: userId,
    ...data,
    // The update time stays while the score is unchanged, so a tie goes to whoever got there first.
    updated_at:
      existing && existing.total_xp === data.total_xp && existing.week_xp === data.week_xp
        ? existing.updated_at
        : new Date().toISOString(),
  };
  g.__gymBoard = [...all.filter((r) => r.user_id !== userId), entry];
  return { ok: true, entry };
}

export async function deleteEntry(userId: string): Promise<boolean> {
  const all = rows();
  g.__gymBoard = all.filter((r) => r.user_id !== userId);
  return g.__gymBoard.length < all.length;
}
