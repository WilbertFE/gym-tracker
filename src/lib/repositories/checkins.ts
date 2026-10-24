/**
 * Public entry point for checkins data. Picks the in-memory demo backend or the
 * Supabase backend per call, and TypeScript checks that both match.
 */
import "server-only";
import { isDemoMode } from "@/lib/demo";
import * as memory from "./memory/checkins";
import * as supabase from "./supabase/checkins";

const impl = () => (isDemoMode() ? memory : supabase);

export const listCheckins = (...args: Parameters<typeof memory.listCheckins>): ReturnType<typeof memory.listCheckins> =>
  impl().listCheckins(...args);

export const upsertCheckin = (...args: Parameters<typeof memory.upsertCheckin>): ReturnType<typeof memory.upsertCheckin> =>
  impl().upsertCheckin(...args);

export const deleteCheckin = (...args: Parameters<typeof memory.deleteCheckin>): ReturnType<typeof memory.deleteCheckin> =>
  impl().deleteCheckin(...args);
