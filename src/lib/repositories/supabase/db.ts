import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Per-request client bound to the signed in user's session cookies. Row Level
 * Security (see supabase/migrations) therefore scopes every query to that user.
 * The repositories still filter by `user_id` explicitly as a second guard.
 */
export const getDb = createClient;

/** Throws on a Supabase error so route handlers return a 500 instead of bad data. */
export function check(error: PostgrestError | { message: string } | null): void {
  if (error) throw new Error(`Supabase error: ${error.message}`);
}

const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";

export const isUniqueViolation = (e: { code?: string } | null) => e?.code === UNIQUE_VIOLATION;
export const isForeignKeyViolation = (e: { code?: string } | null) => e?.code === FOREIGN_KEY_VIOLATION;

/** Numeric columns can arrive as numbers or strings depending on the driver. */
export const num = (v: unknown): number => Number(v);
export const numOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

const PAGE_SIZE = 1000;

/**
 * Reads every row of a query. Supabase caps a single response at 1000 rows, so
 * long histories (workout sets) must be paged. `build` receives an inclusive
 * range and must apply a stable order.
 */
export async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    check(error);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}
