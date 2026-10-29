import { z } from "zod";
import { MUSCLE_GROUPS } from "@/lib/muscles";
import { optionalNotes } from "./common";

const muscle = z.enum(MUSCLE_GROUPS);

export const exerciseSchema = z.object({
  name: z.string().trim().min(1, "Required").max(80),
  primary_muscle: muscle,
  secondary_muscles: z.array(muscle).max(5).default([]),
  equipment: z.string().trim().max(40).nullish(),
  /** A bodyweight exercise: the percent of the body weight it moves, 1 to 150. */
  bodyweight_pct: z.number().min(1).max(150).nullish(),
});

export type ExerciseInput = z.infer<typeof exerciseSchema>;

export const startSessionSchema = z.object({
  notes: optionalNotes,
});

export const sessionNotesSchema = z.object({
  notes: optionalNotes,
});

export const setSchema = z.object({
  exercise_id: z.string().min(1).max(100),
  reps: z.number("Enter reps").int().min(0).max(1000),
  weight_kg: z.number("Enter weight").min(0).max(1000),
  rpe: z.number().min(1).max(10).nullish(),
});

export type SetInput = z.infer<typeof setSchema>;

/** Editing a set never changes its exercise. */
export const setUpdateSchema = setSchema.omit({ exercise_id: true });
export type SetUpdateInput = z.infer<typeof setUpdateSchema>;
