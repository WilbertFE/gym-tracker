/**
 * Public entry point for player profiles. Picks the in-memory demo backend or the Supabase backend per call,
 * and TypeScript checks that both match.
 */
import "server-only";
import { isDemoMode } from "@/lib/demo";
import * as memory from "./memory/profiles";
import * as supabase from "./supabase/profiles";

const impl = () => (isDemoMode() ? memory : supabase);

export const getProfile = (...args: Parameters<typeof memory.getProfile>): ReturnType<typeof memory.getProfile> => impl().getProfile(...args);

export const getProfileByUsername = (...args: Parameters<typeof memory.getProfileByUsername>): ReturnType<typeof memory.getProfileByUsername> =>
  impl().getProfileByUsername(...args);

export const usernameTaken = (...args: Parameters<typeof memory.usernameTaken>): ReturnType<typeof memory.usernameTaken> => impl().usernameTaken(...args);

export const displayNameTaken = (...args: Parameters<typeof memory.displayNameTaken>): ReturnType<typeof memory.displayNameTaken> =>
  impl().displayNameTaken(...args);

export const saveProfile = (...args: Parameters<typeof memory.saveProfile>): ReturnType<typeof memory.saveProfile> => impl().saveProfile(...args);

export const saveSnapshot = (...args: Parameters<typeof memory.saveSnapshot>): ReturnType<typeof memory.saveSnapshot> => impl().saveSnapshot(...args);

export const deleteProfile = (...args: Parameters<typeof memory.deleteProfile>): ReturnType<typeof memory.deleteProfile> => impl().deleteProfile(...args);

export const visibleUsernames = (...args: Parameters<typeof memory.visibleUsernames>): ReturnType<typeof memory.visibleUsernames> =>
  impl().visibleUsernames(...args);
