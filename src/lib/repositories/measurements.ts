/**
 * Public entry point for measurements data. Picks the in-memory demo backend or the
 * Supabase backend per call, and TypeScript checks that both match.
 */
import "server-only";
import { isDemoMode } from "@/lib/demo";
import * as memory from "./memory/measurements";
import * as supabase from "./supabase/measurements";

const impl = () => (isDemoMode() ? memory : supabase);

export const listMeasurements = (...args: Parameters<typeof memory.listMeasurements>): ReturnType<typeof memory.listMeasurements> =>
  impl().listMeasurements(...args);

export const upsertMeasurement = (...args: Parameters<typeof memory.upsertMeasurement>): ReturnType<typeof memory.upsertMeasurement> =>
  impl().upsertMeasurement(...args);

export const deleteMeasurement = (...args: Parameters<typeof memory.deleteMeasurement>): ReturnType<typeof memory.deleteMeasurement> =>
  impl().deleteMeasurement(...args);
