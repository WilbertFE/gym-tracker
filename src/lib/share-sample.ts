import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/muscles";
import type { IntensityLevel } from "@/lib/muscle-intensity";
import { rankForLevel } from "@/lib/ranks";
import type { ShareCard } from "@/lib/share";

/**
 * A made up workout, only for showing what a share look is like: the thumbnails of the looks in the collection
 * draw this with the real share renderer. Nothing in it is anyone's data.
 */
export function sampleShareCard(): ShareCard {
  const levels: Partial<Record<MuscleGroup, IntensityLevel>> = {
    chest: "high",
    front_delts: "mid",
    triceps: "mid",
    side_delts: "low",
    abs: "low",
  };
  return {
    title: "Push day",
    dateLabel: "Tue 3 Nov 2026",
    duration: "1h 05m",
    sets: 18,
    exercises: 5,
    volume: "12,340",
    unit: "kg",
    muscles: [
      { label: "Chest", sets: 8, ratio: 1 },
      { label: "Triceps", sets: 5, ratio: 0.62 },
      { label: "Front delts", sets: 3, ratio: 0.38 },
    ],
    topLifts: [
      { name: "Bench Press", best: "80 kg x 8" },
      { name: "Overhead Press", best: "50 kg x 8" },
      { name: "Tricep Pushdown", best: "35 kg x 12" },
    ],
    bodyLevels: Object.fromEntries(MUSCLE_GROUPS.map((m) => [m, levels[m] ?? "none"])) as Record<MuscleGroup, IntensityLevel>,
    workedMuscles: ["chest", "front_delts", "triceps"],
    progress: { level: 24, rank: rankForLevel(24) },
    location: null,
  };
}
