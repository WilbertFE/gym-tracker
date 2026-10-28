/**
 * Public entry point for user settings. Picks the in-memory demo backend or the
 * Supabase backend per call, and TypeScript checks that both match.
 */
import "server-only";
import { isDemoMode } from "@/lib/demo";
import * as memory from "./memory/settings";
import * as supabase from "./supabase/settings";

const impl = () => (isDemoMode() ? memory : supabase);

export const getSettings = (...args: Parameters<typeof memory.getSettings>): ReturnType<typeof memory.getSettings> =>
  impl().getSettings(...args);

export const saveSettings = (...args: Parameters<typeof memory.saveSettings>): ReturnType<typeof memory.saveSettings> =>
  impl().saveSettings(...args);
