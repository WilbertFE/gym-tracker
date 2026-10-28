import { describe, expect, it } from "vitest";
import { BUILT_IN_EXERCISES, builtInId } from "@/lib/exercise-library";
import type { MuscleGroup } from "@/lib/muscles";
import { buildShareCard, workoutTitle } from "@/lib/share";
import {
  drawShareCard,
  SHARE_FORMATS,
  SHARE_SIZES,
  SHARE_TEMPLATES,
  shareFileName,
} from "@/lib/share-render";
import type { WorkoutSet } from "@/lib/types";

const session = { date: "2026-10-28", duration_minutes: 65 };
let n = 0;
const set = (name: string, reps: number, weight_kg: number): WorkoutSet => ({
  id: `s${n++}`,
  session_id: "w",
  exercise_id: builtInId(name),
  set_number: 1,
  reps,
  weight_kg,
  rpe: null,
  completed_at: "2026-10-28T10:00:00.000Z",
});
const card = (sets: WorkoutSet[], unit: "kg" | "lb" = "kg") =>
  buildShareCard({ session, sets, exercises: BUILT_IN_EXERCISES, unit });

const counts = (entries: [MuscleGroup, number][]) => new Map(entries);

describe("workoutTitle", () => {
  it("names a clear push, pull or legs day", () => {
    expect(workoutTitle(counts([["chest", 6], ["triceps", 3], ["biceps", 1]]))).toBe("Push day");
    expect(workoutTitle(counts([["lats", 7], ["biceps", 3]]))).toBe("Pull day");
    expect(workoutTitle(counts([["quads", 5], ["hamstrings", 3], ["calves", 2]]))).toBe("Legs day");
  });

  it("calls a mixed workout full body", () => {
    expect(workoutTitle(counts([["chest", 3], ["lats", 3], ["quads", 3]]))).toBe("Full body");
  });

  it("falls back to a plain name with nothing to go on", () => {
    expect(workoutTitle(new Map())).toBe("Workout");
  });
});

describe("buildShareCard", () => {
  const sets = [
    set("Barbell Bench Press", 8, 60),
    set("Barbell Bench Press", 6, 70),
    set("Barbell Bench Press", 8, 60),
    set("Lateral Raise", 12, 8),
    set("Tricep Pushdown", 12, 25),
  ];

  it("summarises the workout", () => {
    const c = card(sets);
    expect(c).toMatchObject({
      title: "Push day",
      dateLabel: "Wed 28 Oct 2026",
      duration: "1h 05m",
      sets: 5,
      exercises: 3,
      unit: "kg",
    });
    // 8x60 + 6x70 + 8x60 + 12x8 + 12x25 = 480 + 420 + 480 + 96 + 300
    expect(c.volume).toBe("1,776");
  });

  it("ranks muscles by sets, scaled to the busiest", () => {
    const c = card(sets);
    expect(c.muscles[0]).toMatchObject({ label: "Chest", sets: 3, ratio: 1 });
    expect(c.muscles[1].ratio).toBeCloseTo(1 / 3);
  });

  it("lists top lifts by volume with the heaviest set", () => {
    const c = card(sets);
    expect(c.topLifts[0]).toEqual({ name: "Barbell Bench Press", best: "70 kg x 6" });
    expect(c.topLifts).toHaveLength(3);
  });

  it("shows pounds when asked", () => {
    const c = card(sets, "lb");
    expect(c.unit).toBe("lb");
    expect(c.topLifts[0].best).toBe("154.3 lb x 6");
    expect(c.volume).toBe("3,915");
  });

  it("shows bodyweight sets as bodyweight", () => {
    expect(card([set("Pull Up", 8, 0)]).topLifts[0].best).toBe("Bodyweight x 8");
  });

  it("handles an unknown duration and keeps at most 5 muscles", () => {
    const many = BUILT_IN_EXERCISES.slice(0, 12).map((e) => ({ ...set("Pull Up", 5, 0), exercise_id: e.id }));
    const c = buildShareCard({ session: { date: "2026-10-28", duration_minutes: null }, sets: many, exercises: BUILT_IN_EXERCISES, unit: "kg" });
    expect(c.duration).toBeNull();
    expect(c.muscles.length).toBeLessThanOrEqual(5);
  });
});

/** A canvas context that records the text it is asked to draw and measures it at 10 px a character. */
function fakeContext() {
  const drawn: string[] = [];
  const target: Record<string, unknown> = {
    measureText: (s: string) => ({ width: s.length * 10 }),
    fillText: (s: string) => void drawn.push(s),
    createLinearGradient: () => ({ addColorStop: () => {} }),
  };
  const ctx = new Proxy(target, {
    get: (t, key: string) => (key in t ? t[key] : () => {}),
    set: (t, key: string, value) => ((t[key] = value), true),
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, drawn };
}

describe("drawShareCard", () => {
  const c = card([set("Barbell Bench Press", 8, 60), set("Lateral Raise", 12, 8), set("Tricep Pushdown", 12, 25)]);
  const fonts = { sans: "sans-serif", mono: "monospace" };

  it.each(SHARE_TEMPLATES.flatMap((t) => SHARE_FORMATS.map((f) => [t.value, f.value] as const)))(
    "draws the %s look in the %s size without error",
    (template, format) => {
      const { ctx, drawn } = fakeContext();
      expect(() => drawShareCard(ctx, c, template, format, fonts)).not.toThrow();
      expect(drawn).toContain("GYMTRACK");
      expect(drawn).toContain(c.title);
      expect(drawn).toContain(c.volume);
    },
  );

  it("never uses an em dash", () => {
    const { ctx, drawn } = fakeContext();
    drawShareCard(ctx, c, "classic", "story", fonts);
    expect(drawn.join("")).not.toContain("—");
  });

  it("shortens a name that is too wide instead of overflowing", () => {
    const long = { ...c, topLifts: [{ name: "A".repeat(200), best: "60 kg x 8" }] };
    const { ctx, drawn } = fakeContext();
    drawShareCard(ctx, long, "classic", "square", fonts);
    const shown = drawn.find((s) => s.startsWith("AAA"))!;
    expect(shown.endsWith("...")).toBe(true);
    expect(shown.length).toBeLessThan(200);
  });

  it("has a portrait story size and a square size", () => {
    expect(SHARE_SIZES.story).toEqual({ width: 1080, height: 1920 });
    expect(SHARE_SIZES.square).toEqual({ width: 1080, height: 1080 });
  });
});

describe("shareFileName", () => {
  it("makes a safe, readable file name", () => {
    expect(shareFileName(card([set("Barbell Bench Press", 8, 60)]), "2026-10-28", "story")).toBe(
      "gymtrack-push-day-2026-10-28-story.png",
    );
  });
});
