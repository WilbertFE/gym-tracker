/**
 * Public entry point for workouts data. Picks the in-memory demo backend or the
 * Supabase backend per call, and TypeScript checks that both match.
 */
import "server-only";
import { isDemoMode } from "@/lib/demo";
import * as memory from "./memory/workouts";
import * as supabase from "./supabase/workouts";

export type { AddSetResult } from "./types";

const impl = () => (isDemoMode() ? memory : supabase);

export const listSessions = (...args: Parameters<typeof memory.listSessions>): ReturnType<typeof memory.listSessions> =>
  impl().listSessions(...args);

export const listAllSets = (...args: Parameters<typeof memory.listAllSets>): ReturnType<typeof memory.listAllSets> =>
  impl().listAllSets(...args);

export const getActiveSession = (...args: Parameters<typeof memory.getActiveSession>): ReturnType<typeof memory.getActiveSession> =>
  impl().getActiveSession(...args);

export const getSessionWithSets = (...args: Parameters<typeof memory.getSessionWithSets>): ReturnType<typeof memory.getSessionWithSets> =>
  impl().getSessionWithSets(...args);

export const startSession = (...args: Parameters<typeof memory.startSession>): ReturnType<typeof memory.startSession> =>
  impl().startSession(...args);

export const finishSession = (...args: Parameters<typeof memory.finishSession>): ReturnType<typeof memory.finishSession> =>
  impl().finishSession(...args);

export const updateSessionNotes = (...args: Parameters<typeof memory.updateSessionNotes>): ReturnType<typeof memory.updateSessionNotes> =>
  impl().updateSessionNotes(...args);

export const deleteSession = (...args: Parameters<typeof memory.deleteSession>): ReturnType<typeof memory.deleteSession> =>
  impl().deleteSession(...args);

export const addSet = (...args: Parameters<typeof memory.addSet>): ReturnType<typeof memory.addSet> =>
  impl().addSet(...args);

export const updateSet = (...args: Parameters<typeof memory.updateSet>): ReturnType<typeof memory.updateSet> =>
  impl().updateSet(...args);

export const deleteSet = (...args: Parameters<typeof memory.deleteSet>): ReturnType<typeof memory.deleteSet> =>
  impl().deleteSet(...args);

export const lastSetsByExercise = (...args: Parameters<typeof memory.lastSetsByExercise>): ReturnType<typeof memory.lastSetsByExercise> =>
  impl().lastSetsByExercise(...args);
