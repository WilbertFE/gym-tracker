import { beforeEach, describe, expect, it, vi } from "vitest";
import { BUILT_IN_BODYWEIGHT_PCT, BUILT_IN_EXERCISES, builtInId } from "@/lib/exercise-library";
import { searchExercises } from "@/lib/exercise-search";
import { bodyWeightOn, DEFAULT_BODY_WEIGHT_KG, effectiveLoadKg, isBodyweightExercise, withBodyweightLoad } from "@/lib/load";
import { resetRateLimits } from "@/lib/rate-limit";
import { resetStores } from "@/lib/repositories/memory/store";
import { buildShareCard } from "@/lib/share";
import { sessionVolume } from "@/lib/workout";

vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");

import { POST as postExercise } from "@/app/api/exercises/route";

const pushUp = { bodyweight_pct: 64 };
const pullUp = { bodyweight_pct: 100 };
const squat = { bodyweight_pct: null };

beforeEach(() => {
  resetStores();
  resetRateLimits();
});

describe("effectiveLoadKg", () => {
  it("counts a share of the body weight for a bodyweight exercise", () => {
    expect(effectiveLoadKg(0, pushUp, 60)).toBeCloseTo(38.4);
    expect(effectiveLoadKg(0, pullUp, 80)).toBe(80);
  });

  it("adds the weight worn or held on top of that share", () => {
    expect(effectiveLoadKg(10, pullUp, 80)).toBe(90);
    expect(effectiveLoadKg(5, pushUp, 60)).toBeCloseTo(43.4);
  });

  it("leaves an exercise with only external load as it was logged", () => {
    expect(effectiveLoadKg(100, squat, 80)).toBe(100);
    expect(effectiveLoadKg(100, null, 80)).toBe(100);
    expect(effectiveLoadKg(100, undefined, 80)).toBe(100);
  });

  it("uses 60 kg when no body weight is known", () => {
    expect(DEFAULT_BODY_WEIGHT_KG).toBe(60);
    expect(effectiveLoadKg(0, pullUp)).toBe(60);
    expect(isBodyweightExercise(pushUp)).toBe(true);
    expect(isBodyweightExercise(squat)).toBe(false);
    expect(isBodyweightExercise({ bodyweight_pct: 0 })).toBe(false);
  });
});

describe("bodyWeightOn", () => {
  const weights = [
    { date: "2026-10-01", weight_kg: 72 },
    { date: "2026-10-20", weight_kg: 70 },
  ];

  it("takes the nearest weigh-in on or before the day", () => {
    expect(bodyWeightOn("2026-10-10", weights)).toBe(72);
    expect(bodyWeightOn("2026-10-20", weights)).toBe(70);
    expect(bodyWeightOn("2026-12-01", weights)).toBe(70);
  });

  it("falls back to the oldest weigh-in before the first one, and to 60 kg with none", () => {
    expect(bodyWeightOn("2026-09-01", weights)).toBe(72);
    expect(bodyWeightOn("2026-09-01", [])).toBe(60);
  });
});

describe("withBodyweightLoad", () => {
  const exercises = [
    { id: "pu", bodyweight_pct: 64 },
    { id: "bench", bodyweight_pct: null },
  ];
  const sessions = [
    { id: "s1", date: "2026-10-05" },
    { id: "s2", date: "2026-10-25" },
  ];
  const weights = [
    { date: "2026-10-01", weight_kg: 70 },
    { date: "2026-10-20", weight_kg: 80 },
  ];
  const set = (exercise_id: string, session_id: string, weight_kg: number) => ({ exercise_id, session_id, reps: 10, weight_kg });

  it("replaces the weight of a bodyweight set with its real load, on the weight of that day", () => {
    const [a, b] = withBodyweightLoad([set("pu", "s1", 0), set("pu", "s2", 0)], exercises, sessions, weights);
    expect(a.weight_kg).toBeCloseTo(0.64 * 70);
    expect(b.weight_kg).toBeCloseTo(0.64 * 80);
  });

  it("leaves other sets, and the original sets, untouched", () => {
    const logged = [set("bench", "s1", 60), set("pu", "s1", 0)];
    const loaded = withBodyweightLoad(logged, exercises, sessions, weights);
    expect(loaded[0]).toBe(logged[0]);
    expect(logged[1].weight_kg).toBe(0);
    expect(loaded[1]).not.toBe(logged[1]);
  });

  it("makes push ups count in a workout's volume instead of zero", () => {
    const logged = [set("pu", "s1", 0), set("pu", "s1", 0)];
    expect(sessionVolume(logged)).toBe(0);
    expect(sessionVolume(withBodyweightLoad(logged, exercises, sessions, []))).toBeCloseTo(2 * 10 * 0.64 * 60);
  });
});

describe("the exercise library", () => {
  it("has unique names and ids", () => {
    expect(new Set(BUILT_IN_EXERCISES.map((e) => e.name)).size).toBe(BUILT_IN_EXERCISES.length);
    expect(new Set(BUILT_IN_EXERCISES.map((e) => e.id)).size).toBe(BUILT_IN_EXERCISES.length);
  });

  it("has the exercises that were missing, and more of every muscle", () => {
    const names = BUILT_IN_EXERCISES.map((e) => e.name);
    for (const wanted of ["Dumbbell Bench Press", "Reverse Curl", "Chin Up", "Dumbbell Shoulder Press", "Goblet Squat", "Knee Push Up"]) {
      expect(names, wanted).toContain(wanted);
    }
    expect(BUILT_IN_EXERCISES.length).toBeGreaterThanOrEqual(90);
    const forearms = BUILT_IN_EXERCISES.filter((e) => e.primary_muscle === "forearms").length;
    expect(forearms).toBeGreaterThanOrEqual(3);
  });

  it("gives every bodyweight exercise that moves your body a share of the body weight, between 1 and 150", () => {
    for (const [name, pct] of Object.entries(BUILT_IN_BODYWEIGHT_PCT)) {
      expect(pct, name).toBeGreaterThanOrEqual(1);
      expect(pct, name).toBeLessThanOrEqual(150);
    }
    expect(BUILT_IN_BODYWEIGHT_PCT["Push Up"]).toBe(64);
    expect(BUILT_IN_BODYWEIGHT_PCT["Pull Up"]).toBe(100);
    expect(BUILT_IN_BODYWEIGHT_PCT["Dips"]).toBe(95);
    // Easier and harder push ups follow the published order: incline < knee < standard < decline.
    const pct = BUILT_IN_BODYWEIGHT_PCT;
    expect(pct["Incline Push Up"]).toBeLessThan(pct["Knee Push Up"]);
    expect(pct["Knee Push Up"]).toBeLessThan(pct["Push Up"]);
    expect(pct["Push Up"]).toBeLessThan(pct["Decline Push Up"]);
    // The exercises are read with their share, and an external load exercise has none.
    expect(BUILT_IN_EXERCISES.find((e) => e.id === builtInId("Pull Up"))?.bodyweight_pct).toBe(100);
    expect(BUILT_IN_EXERCISES.find((e) => e.id === builtInId("Barbell Bench Press"))?.bodyweight_pct).toBeNull();
    for (const e of BUILT_IN_EXERCISES) if (e.bodyweight_pct !== null) expect(e.equipment, e.name).toBe("Bodyweight");
  });

  it("never uses an em dash", () => {
    for (const e of BUILT_IN_EXERCISES) expect(e.name).not.toContain("—");
  });
});

describe("searchExercises", () => {
  const find = (query: string) => searchExercises(BUILT_IN_EXERCISES, query).map((e) => e.name);

  it("finds an exercise by its words in any order", () => {
    expect(find("dumbbell press")).toContain("Dumbbell Bench Press");
    expect(find("press dumbbell")).toContain("Dumbbell Shoulder Press");
    expect(find("reverse")).toContain("Reverse Curl");
    expect(find("farmers")).toContain("Farmer's Carry");
  });

  it("finds by equipment and muscle, ignoring case", () => {
    expect(find("CABLE biceps")).toContain("Cable Curl");
    expect(find("bodyweight lats")).toEqual(expect.arrayContaining(["Pull Up", "Chin Up"]));
  });

  it("puts a name match first, and returns nothing for an empty or unknown query", () => {
    expect(find("push up")[0]).toMatch(/push up/i);
    expect(find("   ")).toEqual([]);
    expect(find("zzzz")).toEqual([]);
  });
});

describe("POST /api/exercises with a bodyweight share", () => {
  const post = (body: unknown) => postExercise(new Request("http://localhost/api/exercises", { method: "POST", body: JSON.stringify(body) }));

  it("saves the share of a custom bodyweight exercise", async () => {
    const res = await post({ name: "Ring Push Up", primary_muscle: "chest", secondary_muscles: [], bodyweight_pct: 70 });
    expect(res.status).toBe(201);
    expect((await res.json()).data.bodyweight_pct).toBe(70);
  });

  it("saves none for an exercise with only external load", async () => {
    const res = await post({ name: "Landmine Press", primary_muscle: "front_delts", secondary_muscles: [] });
    expect((await res.json()).data.bodyweight_pct).toBeNull();
  });

  it("refuses a share outside 1 to 150", async () => {
    expect((await post({ name: "Bad One", primary_muscle: "chest", secondary_muscles: [], bodyweight_pct: 0 })).status).toBe(400);
    expect((await post({ name: "Bad Two", primary_muscle: "chest", secondary_muscles: [], bodyweight_pct: 300 })).status).toBe(400);
  });
});

describe("the share image with bodyweight exercises", () => {
  const pushUpEx = BUILT_IN_EXERCISES.find((e) => e.name === "Push Up")!;
  const session = { date: "2026-10-26", duration_minutes: 40 };
  const sets = [
    { id: "a", session_id: "s", exercise_id: pushUpEx.id, set_number: 1, reps: 10, weight_kg: 0, rpe: null, completed_at: "2026-10-26T10:00:00Z" },
    { id: "b", session_id: "s", exercise_id: pushUpEx.id, set_number: 2, reps: 5, weight_kg: 10, rpe: null, completed_at: "2026-10-26T10:05:00Z" },
  ];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body = { levels: {}, worked: [] } as any;

  it("counts the share of the body weight in the volume and labels the best set by what was added", () => {
    const card = buildShareCard({ session, sets, exercises: [pushUpEx], unit: "kg", body, bodyWeightKg: 80 });
    // (10 x 0.64 x 80) + (5 x (10 + 0.64 x 80)) = 512 + 306 = 818 kg
    expect(card.volume).toBe("818");
    expect(card.topLifts[0].best).toBe("+10 kg x 5");
  });

  it("says Bodyweight when nothing was added", () => {
    const card = buildShareCard({ session, sets: [sets[0]], exercises: [pushUpEx], unit: "kg", body });
    expect(card.topLifts[0].best).toBe("Bodyweight x 10");
  });
});
