import { describe, expect, it } from "vitest";
import { BUILT_IN_EXERCISES, builtInId } from "@/lib/exercise-library";
import { MUSCLE_GROUPS, parseMuscle } from "@/lib/muscles";
import { pickFocusExercise } from "@/lib/suggestion";
import type { Exercise } from "@/lib/types";

describe("parseMuscle", () => {
  it("accepts every muscle group", () => {
    for (const m of MUSCLE_GROUPS) expect(parseMuscle(m)).toBe(m);
  });

  it("rejects anything else, so a query parameter can never inject a value", () => {
    for (const bad of [
      "",
      "Calves",
      "calves ",
      "wings",
      "__proto__",
      "constructor",
      "toString",
      "calves,abs",
      "<script>",
      null,
      undefined,
      42,
      ["calves"],
      { 0: "calves" },
    ]) {
      expect(parseMuscle(bad)).toBeNull();
    }
  });
});

describe("pickFocusExercise", () => {
  it("returns an exercise for every muscle group in the built-in library", () => {
    for (const m of MUSCLE_GROUPS) {
      const e = pickFocusExercise(BUILT_IN_EXERCISES, m, []);
      expect(e, m).not.toBeNull();
      expect(e?.primary_muscle).toBe(m);
    }
  });

  it("prefers an exercise the user has done before", () => {
    const calves = BUILT_IN_EXERCISES.filter((e) => e.primary_muscle === "calves");
    expect(calves.length).toBeGreaterThan(1);
    const seated = builtInId("Seated Calf Raise");
    expect(pickFocusExercise(BUILT_IN_EXERCISES, "calves", [seated])?.id).toBe(seated);
  });

  it("falls back to the first in the list when none were used or the used ones are for other muscles", () => {
    const first = BUILT_IN_EXERCISES.find((e) => e.primary_muscle === "calves");
    expect(pickFocusExercise(BUILT_IN_EXERCISES, "calves", [])?.id).toBe(first?.id);
    expect(pickFocusExercise(BUILT_IN_EXERCISES, "calves", [builtInId("Barbell Curl")])?.id).toBe(first?.id);
  });

  it("works with a user's own exercise and returns null when nothing targets the muscle", () => {
    const custom: Exercise = {
      id: "mine",
      user_id: "u",
      name: "Neck Harness",
      primary_muscle: "traps",
      secondary_muscles: [],
      equipment: null,
      bodyweight_pct: null,
    };
    expect(pickFocusExercise([custom], "traps", ["mine"])?.id).toBe("mine");
    expect(pickFocusExercise([custom], "calves", [])).toBeNull();
    expect(pickFocusExercise([], "traps", [])).toBeNull();
  });
});
