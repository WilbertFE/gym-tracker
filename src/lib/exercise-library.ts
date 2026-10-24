import type { Exercise } from "@/lib/types";
import type { MuscleGroup } from "@/lib/muscles";

type Seed = [
  name: string,
  primary: MuscleGroup,
  secondary: MuscleGroup[],
  equipment: string,
];

const SEEDS: Seed[] = [
  ["Barbell Bench Press", "chest", ["front_delts", "triceps"], "Barbell"],
  ["Incline Dumbbell Press", "chest", ["front_delts", "triceps"], "Dumbbell"],
  ["Dumbbell Fly", "chest", ["front_delts"], "Dumbbell"],
  ["Cable Crossover", "chest", ["front_delts"], "Cable"],
  ["Push Up", "chest", ["triceps", "front_delts"], "Bodyweight"],
  ["Overhead Press", "front_delts", ["side_delts", "triceps"], "Barbell"],
  ["Lateral Raise", "side_delts", [], "Dumbbell"],
  ["Face Pull", "rear_delts", ["traps"], "Cable"],
  ["Reverse Pec Deck", "rear_delts", ["traps"], "Machine"],
  ["Barbell Curl", "biceps", ["forearms"], "Barbell"],
  ["Hammer Curl", "biceps", ["forearms"], "Dumbbell"],
  ["Incline Dumbbell Curl", "biceps", [], "Dumbbell"],
  ["Tricep Pushdown", "triceps", [], "Cable"],
  ["Skull Crusher", "triceps", [], "Barbell"],
  ["Dips", "triceps", ["chest", "front_delts"], "Bodyweight"],
  ["Wrist Curl", "forearms", [], "Dumbbell"],
  ["Cable Crunch", "abs", [], "Cable"],
  ["Hanging Leg Raise", "abs", ["obliques"], "Bodyweight"],
  ["Plank", "abs", ["obliques"], "Bodyweight"],
  ["Russian Twist", "obliques", ["abs"], "Bodyweight"],
  ["Cable Woodchop", "obliques", ["abs"], "Cable"],
  ["Barbell Shrug", "traps", ["forearms"], "Barbell"],
  ["Pull Up", "lats", ["biceps", "rear_delts"], "Bodyweight"],
  ["Lat Pulldown", "lats", ["biceps"], "Cable"],
  ["Barbell Row", "lats", ["rear_delts", "biceps", "lower_back"], "Barbell"],
  ["Seated Cable Row", "lats", ["biceps", "rear_delts"], "Cable"],
  ["Back Extension", "lower_back", ["glutes", "hamstrings"], "Bodyweight"],
  ["Hip Thrust", "glutes", ["hamstrings"], "Barbell"],
  ["Barbell Back Squat", "quads", ["glutes", "hamstrings", "lower_back"], "Barbell"],
  ["Leg Press", "quads", ["glutes"], "Machine"],
  ["Leg Extension", "quads", [], "Machine"],
  ["Bulgarian Split Squat", "quads", ["glutes"], "Dumbbell"],
  ["Deadlift", "hamstrings", ["glutes", "lower_back", "traps", "forearms"], "Barbell"],
  ["Romanian Deadlift", "hamstrings", ["glutes", "lower_back"], "Barbell"],
  ["Lying Leg Curl", "hamstrings", [], "Machine"],
  ["Standing Calf Raise", "calves", [], "Machine"],
  ["Seated Calf Raise", "calves", [], "Machine"],
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/**
 * Built-in exercises (user_id null). Ids are stable slugs for now. When moving
 * to Supabase, insert these rows with a seed migration and map the ids.
 */
export const BUILT_IN_EXERCISES: Exercise[] = SEEDS.map(
  ([name, primary_muscle, secondary_muscles, equipment]) => ({
    id: `builtin-${slug(name)}`,
    user_id: null,
    name,
    primary_muscle,
    secondary_muscles,
    equipment,
  }),
);

export const builtInId = (name: string) => `builtin-${slug(name)}`;
