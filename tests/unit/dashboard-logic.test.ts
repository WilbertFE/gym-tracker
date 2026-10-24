import { describe, expect, it } from "vitest";
import { BUILT_IN_EXERCISES, builtInId } from "@/lib/exercise-library";
import { focusOf, suggestNextWorkout } from "@/lib/suggestion";
import type { WorkoutSession, WorkoutSet } from "@/lib/types";
import {
  addDaysISO,
  formatDelta,
  formatKgDelta,
  formatMinutesDelta,
  summarizeWeek,
  weekRange,
} from "@/lib/week";

// 2026-10-24 is a Saturday, so its week runs Monday 19 to Sunday 25 October.
const TODAY = "2026-10-24";

const session = (id: string, date: string, minutes: number | null): WorkoutSession => ({
  id,
  user_id: "u",
  date,
  started_at: `${date}T18:00:00.000Z`,
  ended_at: minutes === null ? null : `${date}T19:00:00.000Z`,
  duration_minutes: minutes,
  notes: null,
});

let n = 0;
const set = (session_id: string, exerciseName: string, reps: number, weight_kg: number): WorkoutSet => ({
  id: `set-${n++}`,
  session_id,
  exercise_id: builtInId(exerciseName),
  set_number: 1,
  reps,
  weight_kg,
  rpe: null,
});

describe("weekRange", () => {
  it("runs Monday to Sunday", () => {
    expect(weekRange("2026-10-24")).toEqual({ start: "2026-10-19", end: "2026-10-25" });
  });

  it("treats Monday as the first day and Sunday as the last", () => {
    expect(weekRange("2026-10-19").start).toBe("2026-10-19");
    expect(weekRange("2026-10-25")).toEqual({ start: "2026-10-19", end: "2026-10-25" });
    expect(weekRange("2026-10-26").start).toBe("2026-10-26");
  });

  it("crosses month and year boundaries", () => {
    expect(addDaysISO("2026-12-28", 7)).toBe("2027-01-04");
    expect(weekRange("2027-01-01")).toEqual({ start: "2026-12-28", end: "2027-01-03" });
  });
});

describe("summarizeWeek", () => {
  const sessions = [
    session("a", "2026-10-20", 60),
    session("b", "2026-10-22", 45),
    session("old", "2026-10-18", 90),
    session("live", "2026-10-24", null),
  ];
  const sets = [
    set("a", "Barbell Bench Press", 10, 50),
    set("a", "Barbell Bench Press", 10, 50),
    set("b", "Pull Up", 8, 0),
    set("b", "Barbell Curl", 10, 20),
    set("old", "Barbell Back Squat", 5, 100),
    set("live", "Leg Press", 10, 100),
  ];

  it("counts only sessions inside the week", () => {
    const w = summarizeWeek(sessions, sets, "2026-10-19");
    expect(w.sessions).toBe(3);
    expect(w.sets).toBe(5);
  });

  it("sums finished minutes and ignores a workout in progress", () => {
    expect(summarizeWeek(sessions, sets, "2026-10-19").minutes).toBe(105);
  });

  it("sums volume and splits it per day", () => {
    const w = summarizeWeek(sessions, sets, "2026-10-19");
    expect(w.volume).toBe(1000 + 200 + 1000);
    expect(w.days).toHaveLength(7);
    expect(w.days[0]).toEqual({ date: "2026-10-19", sessions: 0, volume: 0 });
    expect(w.days[1]).toEqual({ date: "2026-10-20", sessions: 1, volume: 1000 });
    expect(w.days[3]).toEqual({ date: "2026-10-22", sessions: 1, volume: 200 });
    expect(w.days[5]).toEqual({ date: "2026-10-24", sessions: 1, volume: 1000 });
  });

  it("returns zeros for an empty week", () => {
    const w = summarizeWeek(sessions, sets, "2026-09-01");
    expect(w).toMatchObject({ sessions: 0, minutes: 0, sets: 0, volume: 0 });
  });

  it("supports a previous week comparison", () => {
    const prev = summarizeWeek(sessions, sets, addDaysISO("2026-10-19", -7));
    expect(prev.sessions).toBe(1);
    expect(prev.minutes).toBe(90);
    expect(prev.volume).toBe(500);
  });
});

describe("delta formatting", () => {
  it("signs values", () => {
    expect(formatDelta(3)).toBe("+3");
    expect(formatDelta(-2)).toBe("-2");
    expect(formatDelta(0)).toBe("0");
  });

  it("formats minutes and kilograms", () => {
    expect(formatMinutesDelta(75)).toBe("+1h 15m");
    expect(formatMinutesDelta(-20)).toBe("-20m");
    expect(formatKgDelta(1234.4)).toBe("+1,234 kg");
    expect(formatKgDelta(-500)).toBe("-500 kg");
  });
});

describe("focusOf", () => {
  it("maps muscles to a split day and leaves core out", () => {
    expect(focusOf("chest")).toBe("push");
    expect(focusOf("lats")).toBe("pull");
    expect(focusOf("calves")).toBe("legs");
    expect(focusOf("abs")).toBeNull();
  });
});

describe("suggestNextWorkout", () => {
  const run = (sessions: WorkoutSession[], sets: WorkoutSet[]) =>
    suggestNextWorkout({ sessions, sets, exercises: BUILT_IN_EXERCISES, today: TODAY });

  it("starts with push when nothing is logged", () => {
    const s = run([], []);
    expect(s.focus).toBe("push");
    expect(s.daysSince).toBeNull();
    expect(s.reason).toContain("No workouts logged yet");
  });

  it("picks the split that has waited longest", () => {
    const sessions = [
      session("push", "2026-10-22", 60),
      session("pull", "2026-10-20", 60),
      session("legs", "2026-10-17", 60),
    ];
    const sets = [
      set("push", "Barbell Bench Press", 8, 60),
      set("pull", "Barbell Row", 8, 50),
      set("legs", "Barbell Back Squat", 8, 80),
    ];
    const s = run(sessions, sets);
    expect(s.focus).toBe("legs");
    expect(s.daysSince).toBe(7);
    expect(s.reason).toBe("Legs was last trained 7 days ago.");
  });

  it("prefers a split that was never trained", () => {
    const sessions = [session("push", "2026-10-01", 60), session("pull", "2026-10-02", 60)];
    const sets = [set("push", "Barbell Bench Press", 8, 60), set("pull", "Barbell Row", 8, 50)];
    const s = run(sessions, sets);
    expect(s.focus).toBe("legs");
    expect(s.daysSince).toBeNull();
    expect(s.reason).toBe("Legs has not been trained yet.");
  });

  it("uses the most recent date per split, not the first one seen", () => {
    const sessions = [
      session("old", "2026-09-01", 60),
      session("new", "2026-10-23", 60),
      session("pull", "2026-10-10", 60),
      session("legs", "2026-10-12", 60),
    ];
    const sets = [
      set("old", "Barbell Bench Press", 8, 60),
      set("new", "Barbell Bench Press", 8, 60),
      set("pull", "Barbell Row", 8, 50),
      set("legs", "Leg Press", 8, 100),
    ];
    expect(run(sessions, sets).focus).toBe("pull");
  });

  it("falls back to push, pull, legs order on a tie", () => {
    const sessions = [session("all", TODAY, 60)];
    const sets = [
      set("all", "Barbell Bench Press", 8, 60),
      set("all", "Barbell Row", 8, 50),
      set("all", "Leg Press", 8, 100),
    ];
    const s = run(sessions, sets);
    expect(s.focus).toBe("push");
    expect(s.reason).toContain("all trained today");
  });

  it("suggests up to 5 exercises, at most 2 per muscle, all in the focus", () => {
    const s = run([], []);
    expect(s.exercises.length).toBeLessThanOrEqual(5);
    expect(s.exercises.length).toBeGreaterThan(0);
    const perMuscle = new Map<string, number>();
    for (const e of s.exercises) {
      expect(focusOf(e.primary_muscle)).toBe("push");
      perMuscle.set(e.primary_muscle, (perMuscle.get(e.primary_muscle) ?? 0) + 1);
    }
    for (const count of perMuscle.values()) expect(count).toBeLessThanOrEqual(2);
  });

  it("puts the most used exercises first", () => {
    const sessions = [
      session("p", "2026-10-22", 60),
      session("pull", "2026-10-23", 60),
      session("oldlegs", "2026-10-01", 60),
    ];
    const sets = [
      set("p", "Barbell Bench Press", 8, 60),
      set("pull", "Barbell Row", 8, 50),
      // Legs waited longest (23 days). Leg Extension is the favourite there.
      set("oldlegs", "Leg Extension", 12, 40),
      set("oldlegs", "Leg Extension", 12, 40),
      set("oldlegs", "Leg Press", 12, 100),
    ];
    const s = run(sessions, sets);
    expect(s.focus).toBe("legs");
    expect(s.exercises[0].name).toBe("Leg Extension");
  });
});
