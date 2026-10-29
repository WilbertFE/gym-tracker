/**
 * Public entry point for cleared rank trials. Picks the in-memory demo backend or the Supabase backend
 * per call, and TypeScript checks that both match.
 */
import "server-only";
import { isDemoMode } from "@/lib/demo";
import * as memory from "./memory/trials";
import * as supabase from "./supabase/trials";

const impl = () => (isDemoMode() ? memory : supabase);

export const listClearedTrials = (...args: Parameters<typeof memory.listClearedTrials>): ReturnType<typeof memory.listClearedTrials> =>
  impl().listClearedTrials(...args);

export const clearTrial = (...args: Parameters<typeof memory.clearTrial>): ReturnType<typeof memory.clearTrial> =>
  impl().clearTrial(...args);
