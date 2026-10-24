/**
 * Public entry point for memberships data. Picks the in-memory demo backend or the
 * Supabase backend per call, and TypeScript checks that both match.
 */
import "server-only";
import { isDemoMode } from "@/lib/demo";
import * as memory from "./memory/memberships";
import * as supabase from "./supabase/memberships";

const impl = () => (isDemoMode() ? memory : supabase);

export const listMemberships = (...args: Parameters<typeof memory.listMemberships>): ReturnType<typeof memory.listMemberships> =>
  impl().listMemberships(...args);

export const createMembership = (...args: Parameters<typeof memory.createMembership>): ReturnType<typeof memory.createMembership> =>
  impl().createMembership(...args);

export const updateMembership = (...args: Parameters<typeof memory.updateMembership>): ReturnType<typeof memory.updateMembership> =>
  impl().updateMembership(...args);

export const deleteMembership = (...args: Parameters<typeof memory.deleteMembership>): ReturnType<typeof memory.deleteMembership> =>
  impl().deleteMembership(...args);
