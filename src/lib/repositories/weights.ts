/**
 * Public entry point for weights data. Picks the in-memory demo backend or the
 * Supabase backend per call, and TypeScript checks that both match.
 */
import "server-only";
import { isDemoMode } from "@/lib/demo";
import * as memory from "./memory/weights";
import * as supabase from "./supabase/weights";

const impl = () => (isDemoMode() ? memory : supabase);

export const listWeights = (...args: Parameters<typeof memory.listWeights>): ReturnType<typeof memory.listWeights> =>
  impl().listWeights(...args);

export const createWeight = (...args: Parameters<typeof memory.createWeight>): ReturnType<typeof memory.createWeight> =>
  impl().createWeight(...args);

export const updateWeight = (...args: Parameters<typeof memory.updateWeight>): ReturnType<typeof memory.updateWeight> =>
  impl().updateWeight(...args);

export const deleteWeight = (...args: Parameters<typeof memory.deleteWeight>): ReturnType<typeof memory.deleteWeight> =>
  impl().deleteWeight(...args);
