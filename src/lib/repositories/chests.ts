/**
 * Public entry point for opened quest chests and the worn items. Picks the in-memory demo backend or the
 * Supabase backend per call, and TypeScript checks that both match.
 */
import "server-only";
import { isDemoMode } from "@/lib/demo";
import * as memory from "./memory/chests";
import * as supabase from "./supabase/chests";

const impl = () => (isDemoMode() ? memory : supabase);

export const listOpenings = (...args: Parameters<typeof memory.listOpenings>): ReturnType<typeof memory.listOpenings> =>
  impl().listOpenings(...args);

export const recordOpening = (...args: Parameters<typeof memory.recordOpening>): ReturnType<typeof memory.recordOpening> =>
  impl().recordOpening(...args);

export const getEquipment = (...args: Parameters<typeof memory.getEquipment>): ReturnType<typeof memory.getEquipment> =>
  impl().getEquipment(...args);

export const setEquipment = (...args: Parameters<typeof memory.setEquipment>): ReturnType<typeof memory.setEquipment> =>
  impl().setEquipment(...args);

export const listExtraChests = (...args: Parameters<typeof memory.listExtraChests>): ReturnType<typeof memory.listExtraChests> =>
  impl().listExtraChests(...args);
