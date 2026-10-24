/**
 * Public entry point for availability data. Picks the in-memory demo backend or the
 * Supabase backend per call, and TypeScript checks that both match.
 */
import "server-only";
import { isDemoMode } from "@/lib/demo";
import * as memory from "./memory/availability";
import * as supabase from "./supabase/availability";

const impl = () => (isDemoMode() ? memory : supabase);

export const listAvailability = (...args: Parameters<typeof memory.listAvailability>): ReturnType<typeof memory.listAvailability> =>
  impl().listAvailability(...args);

export const createAvailability = (...args: Parameters<typeof memory.createAvailability>): ReturnType<typeof memory.createAvailability> =>
  impl().createAvailability(...args);

export const updateAvailability = (...args: Parameters<typeof memory.updateAvailability>): ReturnType<typeof memory.updateAvailability> =>
  impl().updateAvailability(...args);

export const deleteAvailability = (...args: Parameters<typeof memory.deleteAvailability>): ReturnType<typeof memory.deleteAvailability> =>
  impl().deleteAvailability(...args);
