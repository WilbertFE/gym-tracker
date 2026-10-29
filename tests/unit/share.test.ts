import { describe, expect, it, vi } from "vitest";
import { BUILT_IN_EXERCISES, builtInId } from "@/lib/exercise-library";
import type { MuscleGroup } from "@/lib/muscles";
import { rankForLevel } from "@/lib/ranks";
import { buildShareCard, workoutLocation, workoutTitle } from "@/lib/share";
import {
  drawShareCard,
  SHARE_FORMATS,
  SHARE_SIZES,
  SHARE_TEMPLATES,
  shareFileName,
} from "@/lib/share-render";
import type { WorkoutSession, WorkoutSet } from "@/lib/types";
import { workoutBody } from "@/lib/workout-body";

const session: WorkoutSession = {
  id: "w",
  user_id: "u",
  date: "2026-10-28",
  started_at: "2026-10-28T09:00:00.000Z",
  ended_at: "2026-10-28T10:05:00.000Z",
  duration_minutes: 65,
  notes: null,
};
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
/** The body picture for a workout that is the only one of its week, like a new user's first. */
const bodyFor = (sets: WorkoutSet[]) =>
  workoutBody({ allSessions: [session], allSets: sets, session, sets, exercises: BUILT_IN_EXERCISES });
const card = (sets: WorkoutSet[], unit: "kg" | "lb" = "kg") =>
  buildShareCard({ session, sets, exercises: BUILT_IN_EXERCISES, unit, body: bodyFor(sets) });

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
    const c = buildShareCard({ session: { date: "2026-10-28", duration_minutes: null }, sets: many, exercises: BUILT_IN_EXERCISES, unit: "kg", body: bodyFor(many) });
    expect(c.duration).toBeNull();
    expect(c.muscles.length).toBeLessThanOrEqual(5);
  });
});

describe("the body picture", () => {
  it("is the same data the workout page uses: the week's levels with this workout's muscles picked out", () => {
    const sets = [...Array.from({ length: 6 }, () => set("Barbell Bench Press", 8, 60)), set("Lateral Raise", 12, 8)];
    const c = card(sets);
    expect(c.bodyLevels).toEqual(bodyFor(sets).levels);
    expect(c.workedMuscles).toEqual(bodyFor(sets).worked);
    expect(c.workedMuscles).toEqual(expect.arrayContaining(["chest", "side_delts"]));
    expect(c.bodyLevels.chest).toBe("mid");
    expect(c.bodyLevels.quads).toBe("none");
    expect(Object.keys(c.bodyLevels)).toHaveLength(16);
  });

  it("counts earlier workouts of the same week in the colors, but only this one in the outline", () => {
    const monday = { ...session, id: "m", date: "2026-10-26" };
    const earlier = Array.from({ length: 6 }, () => ({ ...set("Barbell Back Squat", 5, 100), session_id: "m" }));
    const mine = [set("Barbell Bench Press", 8, 60)];
    const body = workoutBody({
      allSessions: [monday, session],
      allSets: [...earlier, ...mine],
      session,
      sets: mine,
      exercises: BUILT_IN_EXERCISES,
    });
    expect(body.levels.quads).not.toBe("none");
    expect(body.worked).not.toContain("quads");
    expect(body.worked).toContain("chest");
  });

  it("is all none with no sets", () => {
    expect(Object.values(bodyFor([]).levels).every((l) => l === "none")).toBe(true);
    expect(bodyFor([]).worked).toEqual([]);
  });
});

describe("workoutLocation", () => {
  const gym = { gymName: "Iron Gym", gymLocation: "Central Branch" };

  it("names the gym and area for a gym day", () => {
    expect(workoutLocation({ kind: "gym", ...gym })).toBe("Iron Gym, Central Branch");
    expect(workoutLocation({ kind: "gym", gymName: "Iron Gym", gymLocation: null })).toBe("Iron Gym");
  });

  it("keeps only the first part of a long geocoded address", () => {
    const long = "Institut Teknologi Sepuluh Nopember, Keputih Gang I, RW 03, Sukolilo, Surabaya, Indonesia";
    expect(workoutLocation({ kind: "gym", gymName: "GYM IKOMA ITS", gymLocation: long })).toBe(
      "GYM IKOMA ITS, Institut Teknologi Sepuluh Nopember",
    );
  });

  it("does not repeat the gym's name", () => {
    expect(workoutLocation({ kind: "gym", gymName: "Iron Gym", gymLocation: "iron gym, Central Branch" })).toBe("Iron Gym");
  });

  it("says home workout for a home day, whatever the membership", () => {
    expect(workoutLocation({ kind: "home", ...gym })).toBe("Home workout");
    expect(workoutLocation({ kind: "home", gymName: null, gymLocation: null })).toBe("Home workout");
  });

  it("is null with no check-in, a rest day, or no gym to name", () => {
    expect(workoutLocation({ kind: null, ...gym })).toBeNull();
    expect(workoutLocation({ kind: "rest", ...gym })).toBeNull();
    expect(workoutLocation({ kind: "gym", gymName: null, gymLocation: null })).toBeNull();
  });

  it("carries the location into the card and never any coordinates", () => {
    const c = buildShareCard({ session, sets: [set("Pull Up", 8, 0)], exercises: BUILT_IN_EXERCISES, unit: "kg", body: bodyFor([]), location: "Iron Gym" });
    expect(c.location).toBe("Iron Gym");
    expect(JSON.stringify(c)).not.toMatch(/latitude|longitude/);
    expect(card([set("Pull Up", 8, 0)]).location).toBeNull();
  });
});

/** A canvas context that records the text it is asked to draw and measures it at 10 px a character. */
function fakeContext() {
  const drawn: string[] = [];
  const fills: string[] = [];
  const strokes: string[] = [];
  let images = 0;
  const placed: { text: string; x: number; size: number }[] = [];
  const fontSize = () => Number(/(\d+)px/.exec(String(target.font))?.[1] ?? 10);
  const target: Record<string, unknown> = {
    fill: () => void fills.push(String((target as { fillStyle?: string }).fillStyle)),
    stroke: () => void strokes.push(String((target as { strokeStyle?: string }).strokeStyle)),
    drawImage: () => void images++,
    // Monospace at 0.6 em a character, like the real font, so a bigger size measures wider.
    measureText: (s: string) => ({ width: s.length * fontSize() * 0.6 }),
    fillText: (s: string, x: number) => {
      drawn.push(s);
      placed.push({ text: s, x, size: fontSize() });
    },
    createLinearGradient: () => ({ addColorStop: () => {} }),
  };
  const ctx = new Proxy(target, {
    get: (t, key: string) => (key in t ? t[key] : () => {}),
    set: (t, key: string, value) => ((t[key] = value), true),
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, drawn, fills, strokes, placed, images: () => images };
}

vi.stubGlobal("Path2D", class {});

describe("drawShareCard", () => {
  const c = card([set("Barbell Bench Press", 8, 60), set("Lateral Raise", 12, 8), set("Tricep Pushdown", 12, 25)]);
  const fonts = { sans: "sans-serif", mono: "monospace" };

  it.each(SHARE_TEMPLATES.flatMap((t) => SHARE_FORMATS.map((f) => [t.value, f.value] as const)))(
    "draws the %s look in the %s size without error",
    (template, format) => {
      const { ctx, drawn } = fakeContext();
      expect(() => drawShareCard(ctx, c, template, format, fonts)).not.toThrow();
      expect(drawn).toContain("MUSCLES LEVELING");
      expect(drawn).toContain(c.title);
      expect(drawn).toContain(c.volume);
    },
  );

  it("colors the body like the workout page: the app's green, yellow and red", () => {
    const heavy = Array.from({ length: 14 }, () => set("Barbell Bench Press", 8, 60));
    const { ctx, fills } = fakeContext();
    drawShareCard(ctx, card(heavy), "classic", "story", fonts);
    // Chest is heavy (red) and shows on the front view, both halves. The legend dots add one of each color.
    expect(fills.filter((f) => f === "#ef4444").length).toBeGreaterThanOrEqual(2);
    expect(fills).toContain("#22c55e");
    expect(fills).toContain("#eab308");

    const idle = fakeContext();
    drawShareCard(idle.ctx, card([]), "classic", "square", fonts);
    // Square has no legend, and with nothing trained there is no color at all.
    for (const color of ["#22c55e", "#eab308", "#ef4444"]) expect(idle.fills).not.toContain(color);
  });

  it("outlines this workout's muscles in the accent color and nothing else", () => {
    const { ctx, strokes } = fakeContext();
    drawShareCard(ctx, card([set("Barbell Bench Press", 8, 60)]), "classic", "story", fonts);
    expect(strokes.filter((c) => c === "#4aa8ff").length).toBeGreaterThanOrEqual(2);

    const idle = fakeContext();
    drawShareCard(idle.ctx, card([]), "classic", "story", fonts);
    expect(idle.strokes).not.toContain("#4aa8ff");
  });

  it("captions the two figures and explains the colors on the story size", () => {
    const story = fakeContext();
    drawShareCard(story.ctx, c, "classic", "story", fonts);
    expect(story.drawn).toEqual(expect.arrayContaining(["FRONT", "BACK", "Light", "Moderate", "Heavy"]));

    const square = fakeContext();
    drawShareCard(square.ctx, c, "classic", "square", fonts);
    expect(square.drawn).toEqual(expect.arrayContaining(["FRONT", "BACK"]));
    expect(square.drawn).not.toContain("Moderate");
  });

  it("draws the rank badge and level when given, and leaves them out otherwise", () => {
    const withRank = { ...c, progress: { level: 12, rank: rankForLevel(12) } };
    const a = fakeContext();
    drawShareCard(a.ctx, withRank, "classic", "story", fonts, { image: {} as CanvasImageSource, width: 148, height: 100 });
    expect(a.images()).toBe(1);
    expect(a.drawn).toEqual(expect.arrayContaining(["LV 12", "PLATE MOVER"]));

    const b = fakeContext();
    drawShareCard(b.ctx, withRank, "classic", "story", fonts, null);
    expect(b.images()).toBe(0);
    expect(b.drawn).not.toContain("LV 12");
  });

  it("draws the location only when there is one", () => {
    const withPlace = { ...c, location: "Iron Gym, Central Branch" };
    const a = fakeContext();
    drawShareCard(a.ctx, withPlace, "classic", "story", fonts);
    expect(a.drawn).toContain("Iron Gym, Central Branch");

    const b = fakeContext();
    drawShareCard(b.ctx, c, "classic", "square", fonts);
    expect(b.drawn.some((t) => t.includes("Iron Gym"))).toBe(false);
  });

  it("shortens a long location instead of overflowing", () => {
    const long = { ...c, location: "G".repeat(300) };
    const { ctx, drawn } = fakeContext();
    drawShareCard(ctx, long, "bold", "story", fonts);
    const shown = drawn.find((t) => t.startsWith("GGG"))!;
    expect(shown.endsWith("...")).toBe(true);
  });

  it("keeps every headline number inside its tile, even a long time with a unit", () => {
    // Tiles are 290 px wide with a 28 px padding, so a value may reach 262 px from the tile's left edge.
    const wide = { ...c, duration: "10h 19m", volume: "123,456", sets: 120 };
    for (const [template, format] of [["classic", "story"], ["bold", "square"], ["light", "story"]] as const) {
      const { ctx, placed } = fakeContext();
      drawShareCard(ctx, wide, template, format, fonts);
      const tiles = [80, 80 + 290 + 24, 80 + 2 * (290 + 24)];
      const values = ["10h 19m", "123,456", "120"].map((v) => placed.find((p) => p.text.startsWith(v.slice(0, 3)))!);
      values.forEach((v, i) => {
        const right = v.x + v.text.length * v.size * 0.6;
        expect(right, `${v.text} in ${template} ${format}`).toBeLessThanOrEqual(tiles[i] + 290 - 28);
      });
    }
  });

  it("puts the unit after the volume without covering it", () => {
    const { ctx, placed } = fakeContext();
    drawShareCard(ctx, { ...c, volume: "12,340" }, "classic", "story", fonts);
    const value = placed.find((p) => p.text === "12,340")!;
    const unit = placed.find((p) => p.text === "kg")!;
    expect(unit.x).toBeGreaterThanOrEqual(value.x + value.text.length * value.size * 0.6);
  });

  it("never uses an em dash", () => {
    const { ctx, drawn } = fakeContext();
    drawShareCard(ctx, c, "classic", "story", fonts);
    expect(drawn.join("")).not.toContain("—");
  });

  it("shortens a name that is too wide instead of overflowing", () => {
    const long = { ...c, topLifts: [{ name: "A".repeat(200), best: "60 kg x 8" }] };
    const { ctx, drawn } = fakeContext();
    drawShareCard(ctx, long, "classic", "story", fonts);
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
      "muscles-leveling-push-day-2026-10-28-story.png",
    );
  });
});
