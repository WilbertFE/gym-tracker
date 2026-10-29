import { MUSCLE_LABELS } from "@/lib/muscles";
import type { Exercise } from "@/lib/types";

/** Lowercase, without accents or punctuation, so "Farmer's Carry" is found by "farmers". */
const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, "");

/**
 * The exercises that match what was typed. Every word has to appear in the name, the equipment, the muscle or the
 * secondary muscles, in any order ("press dumbbell" finds the dumbbell bench press). A match in the name comes first,
 * and a name that starts with the first word before one that only contains it.
 */
export function searchExercises(exercises: readonly Exercise[], query: string): Exercise[] {
  const words = normalize(query).split(" ").filter(Boolean);
  if (words.length === 0) return [];

  const scored: { exercise: Exercise; score: number }[] = [];
  for (const exercise of exercises) {
    const name = normalize(exercise.name);
    const other = normalize(
      [exercise.equipment ?? "", MUSCLE_LABELS[exercise.primary_muscle], ...exercise.secondary_muscles.map((m) => MUSCLE_LABELS[m])].join(" "),
    );
    if (!words.every((w) => name.includes(w) || other.includes(w))) continue;
    let score = 0;
    if (words.every((w) => name.includes(w))) score += 2;
    if (name.startsWith(words[0])) score += 1;
    scored.push({ exercise, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name)).map((s) => s.exercise);
}
