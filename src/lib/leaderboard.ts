import { weekRange, addDaysISO } from "@/lib/week";
import type { XpSummary } from "@/lib/xp";

export const LEADERBOARD = {
  minNameLength: 3,
  maxNameLength: 20,
  /** How many rows a board shows. */
  top: 50,
  /**
   * One day counts at most this much XP on the board. A very full day, boosted to double, is around
   * 300, so a normal player never meets the limit and a pile of faked rows on one day does not help.
   */
  dayCapXp: 400,
  /** Minimum time between two syncs of the same user. */
  syncThrottleMs: 10_000,
} as const;

export type BoardScope = "global" | "country";
export type BoardPeriod = "all" | "week";

export const isBoardScope = (v: unknown): v is BoardScope => v === "global" || v === "country";
export const isBoardPeriod = (v: unknown): v is BoardPeriod => v === "all" || v === "week";

/** A row of the board. This is all anyone can see of a user who joined. */
export type LeaderboardEntry = {
  user_id: string;
  display_name: string;
  /** ISO country code, or null when the user has none set. */
  country: string | null;
  total_xp: number;
  week_xp: number;
  /** The Monday that `week_xp` belongs to. An older value means no XP yet this week. */
  week_start: string;
  level: number;
  /** The title worn next to the nickname, or null. */
  title: string | null;
  updated_at: string;
};

/** What the server writes when it syncs a user. */
export type EntryData = Pick<LeaderboardEntry, "display_name" | "country" | "total_xp" | "week_xp" | "week_start" | "level" | "title">;

const RESERVED = ["admin", "administrator", "moderator", "mod", "support", "staff", "system", "official", "muscles leveling", "you"];

export type NameCheck = { ok: true; name: string } | { ok: false; message: string };

/**
 * A nickname others will see. Plain letters, digits, spaces, dots, dashes and underscores, so it can
 * never look like an email address or contain markup, and a few names are kept for the team.
 */
export function validateDisplayName(raw: unknown): NameCheck {
  if (typeof raw !== "string") return { ok: false, message: "Choose a nickname." };
  const name = raw.trim().replace(/\s+/g, " ");
  const { minNameLength: min, maxNameLength: max } = LEADERBOARD;
  if (name.length < min) return { ok: false, message: `Use at least ${min} characters.` };
  if (name.length > max) return { ok: false, message: `Use at most ${max} characters.` };
  if (!/^[\p{L}\p{N} ._-]+$/u.test(name)) {
    return { ok: false, message: "Use letters, numbers, spaces, dots, dashes and underscores only." };
  }
  if (!/[\p{L}\p{N}]/u.test(name)) return { ok: false, message: "Include at least one letter or number." };
  if (RESERVED.includes(name.toLowerCase())) return { ok: false, message: "That name is reserved. Pick another." };
  return { ok: true, name };
}

/**
 * The XP that goes on the board: all time and this week. Each day counts at most `dayCapXp`, and the
 * streak milestone bonuses, which belong to no single day, count in all time only.
 */
export function boardXp(xp: Pick<XpSummary, "byDate" | "lines">, today: string): { total: number; week: number } {
  const { start, end } = weekRange(today);
  const streakBonus = xp.lines.find((l) => l.source === "streak")?.xp ?? 0;
  let total = streakBonus;
  let week = 0;
  for (const [date, amount] of Object.entries(xp.byDate)) {
    const counted = Math.min(amount, LEADERBOARD.dayCapXp);
    total += counted;
    if (date >= start && date <= end) week += counted;
  }
  return { total: Math.round(total), week: Math.round(week) };
}

/** A row's XP for a period. A weekly score from an earlier week is zero this week. */
export function entryXp(entry: Pick<LeaderboardEntry, "total_xp" | "week_xp" | "week_start">, period: BoardPeriod, weekStart: string): number {
  if (period === "all") return entry.total_xp;
  return entry.week_start === weekStart ? entry.week_xp : 0;
}

/**
 * Best first: more XP, then whoever got there first (the earlier update), then the name. The
 * Supabase queries use the same order so both backends agree.
 */
export function rankRows<T extends LeaderboardEntry>(rows: T[], period: BoardPeriod, weekStart: string): T[] {
  return rows
    .filter((r) => period === "all" || entryXp(r, period, weekStart) > 0)
    .sort(
      (a, b) =>
        entryXp(b, period, weekStart) - entryXp(a, period, weekStart) ||
        a.updated_at.localeCompare(b.updated_at) ||
        a.display_name.localeCompare(b.display_name),
    );
}

/** Where a user stands (1 is first), or null when not on this board. */
export function positionOf(sorted: LeaderboardEntry[], userId: string): number | null {
  const index = sorted.findIndex((r) => r.user_id === userId);
  return index === -1 ? null : index + 1;
}

/** Monday of the current week, the key the weekly board is filtered by. */
export const currentWeekStart = (today: string): string => weekRange(today).start;

/** The week a date belongs to, as the Monday it starts on. */
export const weekOf = (date: string): string => weekRange(date).start;

/** The Sunday that ends a week, for display. */
export const weekEnd = (weekStart: string): string => addDaysISO(weekStart, 6);
