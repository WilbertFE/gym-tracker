/**
 * Public entry point for used XP boosters. Picks the in-memory demo backend or the Supabase backend
 * per call, and TypeScript checks that both match.
 */
import "server-only";
import { isDemoMode } from "@/lib/demo";
import * as memory from "./memory/boosts";
import * as supabase from "./supabase/boosts";

const impl = () => (isDemoMode() ? memory : supabase);

export const listBoosts = (...args: Parameters<typeof memory.listBoosts>): ReturnType<typeof memory.listBoosts> =>
  impl().listBoosts(...args);

export const createBoost = (...args: Parameters<typeof memory.createBoost>): ReturnType<typeof memory.createBoost> =>
  impl().createBoost(...args);
