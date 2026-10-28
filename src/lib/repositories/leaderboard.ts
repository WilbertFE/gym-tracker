/**
 * Public entry point for the leaderboard. Picks the in-memory demo backend or the Supabase backend
 * per call, and TypeScript checks that both match.
 */
import "server-only";
import { isDemoMode } from "@/lib/demo";
import * as memory from "./memory/leaderboard";
import * as supabase from "./supabase/leaderboard";

const impl = () => (isDemoMode() ? memory : supabase);

export const listBoard = (...args: Parameters<typeof memory.listBoard>): ReturnType<typeof memory.listBoard> =>
  impl().listBoard(...args);

export const rankOf = (...args: Parameters<typeof memory.rankOf>): ReturnType<typeof memory.rankOf> =>
  impl().rankOf(...args);

export const getEntry = (...args: Parameters<typeof memory.getEntry>): ReturnType<typeof memory.getEntry> =>
  impl().getEntry(...args);

export const upsertEntry = (...args: Parameters<typeof memory.upsertEntry>): ReturnType<typeof memory.upsertEntry> =>
  impl().upsertEntry(...args);

export const deleteEntry = (...args: Parameters<typeof memory.deleteEntry>): ReturnType<typeof memory.deleteEntry> =>
  impl().deleteEntry(...args);
