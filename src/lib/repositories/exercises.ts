/**
 * Public entry point for exercises data. Picks the in-memory demo backend or the
 * Supabase backend per call, and TypeScript checks that both match.
 */
import "server-only";
import { isDemoMode } from "@/lib/demo";
import * as memory from "./memory/exercises";
import * as supabase from "./supabase/exercises";

export type { DeleteExerciseResult } from "./types";

const impl = () => (isDemoMode() ? memory : supabase);

export const listExercises = (...args: Parameters<typeof memory.listExercises>): ReturnType<typeof memory.listExercises> =>
  impl().listExercises(...args);

export const createExercise = (...args: Parameters<typeof memory.createExercise>): ReturnType<typeof memory.createExercise> =>
  impl().createExercise(...args);

export const deleteExercise = (...args: Parameters<typeof memory.deleteExercise>): ReturnType<typeof memory.deleteExercise> =>
  impl().deleteExercise(...args);
