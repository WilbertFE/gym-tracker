/** Fixed muscle group list shared by data, UI and the body model (README section 7.1). */
export const MUSCLE_GROUPS = [
  "chest",
  "front_delts",
  "side_delts",
  "rear_delts",
  "biceps",
  "triceps",
  "forearms",
  "abs",
  "obliques",
  "traps",
  "lats",
  "lower_back",
  "glutes",
  "quads",
  "hamstrings",
  "calves",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: "Chest",
  front_delts: "Front delts",
  side_delts: "Side delts",
  rear_delts: "Rear delts",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  abs: "Abs",
  obliques: "Obliques",
  traps: "Traps",
  lats: "Lats",
  lower_back: "Lower back",
  glutes: "Glutes",
  quads: "Quads",
  hamstrings: "Hamstrings",
  calves: "Calves",
};

/** Reads an untrusted value (for example a query parameter) as a muscle group, or null. */
export function parseMuscle(value: unknown): MuscleGroup | null {
  return typeof value === "string" && (MUSCLE_GROUPS as readonly string[]).includes(value)
    ? (value as MuscleGroup)
    : null;
}
