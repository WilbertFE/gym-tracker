import { afterEach, describe, expect, it, vi } from "vitest";
import type { WorkoutSet } from "@/lib/types";
import { pickLastSets } from "@/lib/workout";

// The Supabase modules are replaced so these tests never need a database or cookies.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/repositories/supabase/checkins", () => ({
  listCheckins: vi.fn(async () => ["from-supabase"]),
  upsertCheckin: vi.fn(),
  deleteCheckin: vi.fn(),
}));

import { listCheckins } from "@/lib/repositories/checkins";
import { check, fetchAll, isForeignKeyViolation, isUniqueViolation, num, numOrNull } from "@/lib/repositories/supabase/db";

const DEMO = "00000000-0000-4000-8000-000000000001";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("backend selection", () => {
  it("uses the in-memory backend in demo mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");
    const rows = await listCheckins(DEMO);
    expect(rows).not.toEqual(["from-supabase"]);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toHaveProperty("went_to_gym");
  });

  it("uses Supabase when demo mode is off or unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false");
    expect(await listCheckins(DEMO)).toEqual(["from-supabase"]);
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "");
    expect(await listCheckins(DEMO)).toEqual(["from-supabase"]);
  });

  it("never uses demo data in production, even if the flag is left on", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");
    vi.stubEnv("NODE_ENV", "production");
    expect(await listCheckins(DEMO)).toEqual(["from-supabase"]);
  });
});

describe("fetchAll", () => {
  const pageOf = (n: number, offset = 0) => Array.from({ length: n }, (_, i) => offset + i);

  it("reads every page until a short page", async () => {
    const calls: [number, number][] = [];
    const rows = await fetchAll<number>(async (from, to) => {
      calls.push([from, to]);
      if (from === 0) return { data: pageOf(1000), error: null };
      if (from === 1000) return { data: pageOf(1000, 1000), error: null };
      return { data: pageOf(250, 2000), error: null };
    });
    expect(rows).toHaveLength(2250);
    expect(calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("stops after one request when the result is short or empty", async () => {
    const build = vi.fn(async () => ({ data: pageOf(3), error: null }));
    expect(await fetchAll<number>(build)).toEqual([0, 1, 2]);
    expect(build).toHaveBeenCalledTimes(1);

    const empty = vi.fn(async () => ({ data: null, error: null }));
    expect(await fetchAll<number>(empty)).toEqual([]);
  });

  it("makes a request for the next page when a page is exactly full", async () => {
    const build = vi
      .fn()
      .mockResolvedValueOnce({ data: pageOf(1000), error: null })
      .mockResolvedValueOnce({ data: [], error: null });
    expect(await fetchAll<number>(build)).toHaveLength(1000);
    expect(build).toHaveBeenCalledTimes(2);
  });

  it("throws on an error instead of returning partial data", async () => {
    // Only message is read, so a partial object is enough for this test.
    const error = { message: "permission denied", code: "42501" } as never;
    await expect(fetchAll<number>(async () => ({ data: null, error }))).rejects.toThrow("permission denied");
  });
});

describe("db helpers", () => {
  it("check throws only when there is an error", () => {
    expect(() => check(null)).not.toThrow();
    expect(() => check({ message: "boom" })).toThrow("Supabase error: boom");
  });

  it("recognises unique and foreign key violations", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isForeignKeyViolation({ code: "23503" })).toBe(true);
    expect(isForeignKeyViolation({})).toBe(false);
  });

  it("coerces numeric values that may arrive as strings", () => {
    expect(num("62.50")).toBe(62.5);
    expect(num(7)).toBe(7);
    expect(numOrNull(null)).toBeNull();
    expect(numOrNull(undefined)).toBeNull();
    expect(numOrNull("19.5")).toBe(19.5);
    expect(numOrNull(0)).toBe(0);
  });
});

const set = (session_id: string, exercise_id: string, set_number: number, reps: number, weight_kg: number): WorkoutSet => ({
  id: `${session_id}-${exercise_id}-${set_number}`,
  session_id,
  exercise_id,
  set_number,
  reps,
  weight_kg,
  rpe: null,
});

describe("pickLastSets", () => {
  const sessions = [
    { id: "old", started_at: "2026-10-01T18:00:00.000Z" },
    { id: "new", started_at: "2026-10-20T18:00:00.000Z" },
    { id: "now", started_at: "2026-10-24T18:00:00.000Z" },
  ];

  it("takes the newest session, then the highest set number", () => {
    const result = pickLastSets(
      [set("old", "bench", 3, 5, 100), set("new", "bench", 1, 8, 60), set("new", "bench", 2, 6, 62.5)],
      sessions,
      "now",
    );
    expect(result.bench).toEqual({ reps: 6, weight_kg: 62.5 });
  });

  it("prefers the current session over any other", () => {
    const result = pickLastSets(
      [set("new", "bench", 4, 8, 60), set("old", "bench", 1, 3, 30)],
      sessions,
      "old",
    );
    expect(result.bench).toEqual({ reps: 3, weight_kg: 30 });
  });

  it("returns one entry per exercise and ignores sets without a known session", () => {
    const result = pickLastSets(
      [set("new", "bench", 1, 8, 60), set("new", "squat", 1, 5, 100), set("ghost", "row", 1, 9, 40)],
      sessions,
      "now",
    );
    expect(Object.keys(result).sort()).toEqual(["bench", "row", "squat"]);
    // An unknown session ranks lowest but is still the only source for that exercise.
    expect(result.row).toEqual({ reps: 9, weight_kg: 40 });
  });

  it("is empty with no sets", () => {
    expect(pickLastSets([], sessions, "now")).toEqual({});
  });
});
