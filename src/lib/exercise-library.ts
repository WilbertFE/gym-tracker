import type { Exercise } from "@/lib/types";
import type { MuscleGroup } from "@/lib/muscles";

type Seed = [
  name: string,
  primary: MuscleGroup,
  secondary: MuscleGroup[],
  equipment: string,
  /**
   * For a bodyweight exercise: the share of your body weight it moves, in percent. The weight you log is then
   * only what you add on top (a vest, a belt, a plate). Left out when the load is all external.
   */
  bodyweightPct?: number,
];

const SEEDS: Seed[] = [
  ["Barbell Bench Press", "chest", ["front_delts", "triceps"], "Barbell"],
  ["Incline Dumbbell Press", "chest", ["front_delts", "triceps"], "Dumbbell"],
  ["Dumbbell Fly", "chest", ["front_delts"], "Dumbbell"],
  ["Cable Crossover", "chest", ["front_delts"], "Cable"],
  ["Push Up", "chest", ["triceps", "front_delts"], "Bodyweight", 64],
  ["Overhead Press", "front_delts", ["side_delts", "triceps"], "Barbell"],
  ["Lateral Raise", "side_delts", [], "Dumbbell"],
  ["Face Pull", "rear_delts", ["traps"], "Cable"],
  ["Reverse Pec Deck", "rear_delts", ["traps"], "Machine"],
  ["Barbell Curl", "biceps", ["forearms"], "Barbell"],
  ["Hammer Curl", "biceps", ["forearms"], "Dumbbell"],
  ["Incline Dumbbell Curl", "biceps", [], "Dumbbell"],
  ["Tricep Pushdown", "triceps", [], "Cable"],
  ["Skull Crusher", "triceps", [], "Barbell"],
  ["Dips", "triceps", ["chest", "front_delts"], "Bodyweight", 95],
  ["Wrist Curl", "forearms", [], "Dumbbell"],
  ["Cable Crunch", "abs", [], "Cable"],
  ["Hanging Leg Raise", "abs", ["obliques"], "Bodyweight", 45],
  ["Plank", "abs", ["obliques"], "Bodyweight"],
  ["Russian Twist", "obliques", ["abs"], "Bodyweight"],
  ["Cable Woodchop", "obliques", ["abs"], "Cable"],
  ["Barbell Shrug", "traps", ["forearms"], "Barbell"],
  ["Pull Up", "lats", ["biceps", "rear_delts"], "Bodyweight", 100],
  ["Lat Pulldown", "lats", ["biceps"], "Cable"],
  ["Barbell Row", "lats", ["rear_delts", "biceps", "lower_back"], "Barbell"],
  ["Seated Cable Row", "lats", ["biceps", "rear_delts"], "Cable"],
  ["Back Extension", "lower_back", ["glutes", "hamstrings"], "Bodyweight", 50],
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
  ["Dumbbell Bench Press", "chest", ["front_delts", "triceps"], "Dumbbell"],
  ["Incline Barbell Bench Press", "chest", ["front_delts", "triceps"], "Barbell"],
  ["Chest Press Machine", "chest", ["front_delts", "triceps"], "Machine"],
  ["Pec Deck Fly", "chest", ["front_delts"], "Machine"],
  ["Knee Push Up", "chest", ["triceps", "front_delts"], "Bodyweight", 49],
  ["Incline Push Up", "chest", ["triceps", "front_delts"], "Bodyweight", 41],
  ["Decline Push Up", "chest", ["front_delts", "triceps"], "Bodyweight", 74],
  ["Dumbbell Shoulder Press", "front_delts", ["side_delts", "triceps"], "Dumbbell"],
  ["Arnold Press", "front_delts", ["side_delts", "triceps"], "Dumbbell"],
  ["Machine Shoulder Press", "front_delts", ["side_delts", "triceps"], "Machine"],
  ["Front Raise", "front_delts", ["side_delts"], "Dumbbell"],
  ["Pike Push Up", "front_delts", ["side_delts", "triceps"], "Bodyweight", 70],
  ["Cable Lateral Raise", "side_delts", [], "Cable"],
  ["Upright Row", "side_delts", ["traps", "biceps"], "Barbell"],
  ["Rear Delt Fly", "rear_delts", ["traps"], "Dumbbell"],
  ["Dumbbell Curl", "biceps", ["forearms"], "Dumbbell"],
  ["EZ Bar Curl", "biceps", ["forearms"], "Barbell"],
  ["Reverse Curl", "biceps", ["forearms"], "Barbell"],
  ["Preacher Curl", "biceps", [], "Barbell"],
  ["Concentration Curl", "biceps", [], "Dumbbell"],
  ["Cable Curl", "biceps", ["forearms"], "Cable"],
  ["Overhead Triceps Extension", "triceps", [], "Dumbbell"],
  ["Triceps Kickback", "triceps", [], "Dumbbell"],
  ["Close Grip Bench Press", "triceps", ["chest", "front_delts"], "Barbell"],
  ["Cable Overhead Triceps Extension", "triceps", [], "Cable"],
  ["Diamond Push Up", "triceps", ["chest", "front_delts"], "Bodyweight", 64],
  ["Reverse Wrist Curl", "forearms", [], "Dumbbell"],
  ["Farmer's Carry", "forearms", ["traps"], "Dumbbell"],
  ["Dumbbell Row", "lats", ["biceps", "rear_delts"], "Dumbbell"],
  ["T-Bar Row", "lats", ["rear_delts", "biceps", "lower_back"], "Barbell"],
  ["Straight Arm Pulldown", "lats", [], "Cable"],
  ["Dumbbell Pullover", "lats", ["chest", "triceps"], "Dumbbell"],
  ["Chin Up", "lats", ["biceps"], "Bodyweight", 100],
  ["Inverted Row", "lats", ["biceps", "rear_delts"], "Bodyweight", 60],
  ["Dumbbell Shrug", "traps", ["forearms"], "Dumbbell"],
  ["Good Morning", "lower_back", ["hamstrings", "glutes"], "Barbell"],
  ["Superman", "lower_back", ["glutes"], "Bodyweight", 40],
  ["Goblet Squat", "quads", ["glutes"], "Dumbbell"],
  ["Front Squat", "quads", ["glutes", "lower_back"], "Barbell"],
  ["Hack Squat", "quads", ["glutes"], "Machine"],
  ["Dumbbell Lunge", "quads", ["glutes", "hamstrings"], "Dumbbell"],
  ["Walking Lunge", "quads", ["glutes", "hamstrings"], "Bodyweight", 65],
  ["Bodyweight Squat", "quads", ["glutes"], "Bodyweight", 70],
  ["Dumbbell Romanian Deadlift", "hamstrings", ["glutes", "lower_back"], "Dumbbell"],
  ["Seated Leg Curl", "hamstrings", [], "Machine"],
  ["Glute Bridge", "glutes", ["hamstrings"], "Bodyweight", 50],
  ["Cable Glute Kickback", "glutes", ["hamstrings"], "Cable"],
  ["Hip Abduction Machine", "glutes", [], "Machine"],
  ["Bodyweight Calf Raise", "calves", [], "Bodyweight", 100],
  ["Crunch", "abs", [], "Bodyweight", 30],
  ["Sit Up", "abs", [], "Bodyweight", 50],
  ["Leg Raise", "abs", ["obliques"], "Bodyweight", 45],
  ["Mountain Climber", "abs", ["obliques"], "Bodyweight", 60],
  ["Ab Wheel Rollout", "abs", [], "Bodyweight", 60],
  ["Machine Crunch", "abs", [], "Machine"],
  ["Bicycle Crunch", "obliques", ["abs"], "Bodyweight", 30],
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/**
 * Built-in exercises (user_id null). Ids are stable slugs for now. When moving
 * to Supabase, insert these rows with a seed migration and map the ids.
 */
export const BUILT_IN_EXERCISES: Exercise[] = SEEDS.map(
  ([name, primary_muscle, secondary_muscles, equipment, bodyweightPct]) => ({
    id: `builtin-${slug(name)}`,
    user_id: null,
    name,
    primary_muscle,
    secondary_muscles,
    equipment,
    bodyweight_pct: bodyweightPct ?? null,
  }),
);

/**
 * The bodyweight share of each built-in exercise, by name. The database copy of a built-in can lag behind this list
 * (it only changes with a migration), so a built-in always takes its share from here.
 */
export const BUILT_IN_BODYWEIGHT_PCT: Readonly<Record<string, number>> = Object.fromEntries(
  SEEDS.filter((seed) => seed[4] !== undefined).map((seed) => [seed[0], seed[4] as number]),
);

export const builtInId = (name: string) => `builtin-${slug(name)}`;
