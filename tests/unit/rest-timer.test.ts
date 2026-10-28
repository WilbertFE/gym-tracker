import { format } from "date-fns";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimits } from "@/lib/rate-limit";
import { resetStores } from "@/lib/repositories/memory/store";
import { formatElapsed, lastSetCompletedAt, REST_TARGET_SECONDS, restBeforeSets } from "@/lib/workout";

vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");

// The demo gym is pinned at this point, so a position here counts as being at the gym.
const AT_GYM = { latitude: -6.2088, longitude: 106.8456, accuracy: 15 };

import { POST as postCheckin } from "@/app/api/checkins/route";
import { POST as postSet } from "@/app/api/workouts/[id]/sets/route";
import { POST as startWorkout } from "@/app/api/workouts/route";
import { builtInId } from "@/lib/exercise-library";
import { getSessionWithSets } from "@/lib/repositories/workouts";

const DEMO = "00000000-0000-4000-8000-000000000001";
const at = (seconds: number) => new Date(Date.UTC(2026, 9, 28, 10, 0, seconds)).toISOString();
const s = (id: string, seconds: number) => ({ id, completed_at: at(seconds) });

describe("lastSetCompletedAt", () => {
  it("is null with no sets", () => {
    expect(lastSetCompletedAt([])).toBeNull();
  });

  it("returns the newest time whatever the order", () => {
    expect(lastSetCompletedAt([s("a", 100), s("b", 400), s("c", 250)])).toBe(at(400));
  });
});

describe("restBeforeSets", () => {
  it("has no rest for the first set and the gap for each later one", () => {
    const rest = restBeforeSets([s("a", 0), s("b", 90), s("c", 200)]);
    expect(rest.has("a")).toBe(false);
    expect(rest.get("b")).toBe(90);
    expect(rest.get("c")).toBe(110);
  });

  it("orders by time, not by the order given, and runs across exercises", () => {
    const rest = restBeforeSets([s("c", 200), s("a", 0), s("b", 90)]);
    expect(rest.get("b")).toBe(90);
    expect(rest.get("c")).toBe(110);
  });

  it("leaves out a zero gap, which is what sets from before timestamps look like", () => {
    const rest = restBeforeSets([s("a", 0), s("b", 0), s("c", 0)]);
    expect(rest.size).toBe(0);
  });
});

describe("rest timer constants", () => {
  it("formats a rest as minutes and seconds", () => {
    expect(formatElapsed(REST_TARGET_SECONDS)).toBe("01:30");
  });
});

describe("logging a set records when it was completed", () => {
  beforeEach(() => {
    resetStores();
    resetRateLimits();
  });

  const json = (body: unknown) => new Request("http://localhost/api/x", { method: "POST", body: JSON.stringify(body) });
  const ctx = (id: string) => ({ params: Promise.resolve({ id }) }) as never;

  it("stamps each set with the time it was logged, in order", async () => {
    await postCheckin(json({ date: format(new Date(), "yyyy-MM-dd"), went_to_gym: true, ...AT_GYM }));
    const { data } = await (await startWorkout(new Request("http://localhost/api/x", { method: "POST" }))).json();

    const before = Date.now();
    const exercise_id = builtInId("Barbell Bench Press");
    await postSet(json({ exercise_id, reps: 8, weight_kg: 60 }), ctx(data.id));
    await postSet(json({ exercise_id, reps: 8, weight_kg: 60 }), ctx(data.id));
    const after = Date.now();

    const { sets } = (await getSessionWithSets(DEMO, data.id))!;
    expect(sets).toHaveLength(2);
    for (const set of sets) {
      const t = new Date(set.completed_at).getTime();
      expect(t).toBeGreaterThanOrEqual(before);
      expect(t).toBeLessThanOrEqual(after);
    }
    expect(sets[1].completed_at >= sets[0].completed_at).toBe(true);
  });

  it("keeps seed workouts usable: every demo set has a time", async () => {
    const { listAllSets } = await import("@/lib/repositories/workouts");
    const sets = await listAllSets(DEMO);
    expect(sets.length).toBeGreaterThan(0);
    expect(sets.every((x) => !Number.isNaN(new Date(x.completed_at).getTime()))).toBe(true);
    // The seed is dated in the past, so nothing is in the future.
    expect(Math.max(...sets.map((x) => new Date(x.completed_at).getTime()))).toBeLessThan(Date.now());
  });
});
