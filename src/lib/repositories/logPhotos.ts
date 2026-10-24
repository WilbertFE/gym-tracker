/**
 * Public entry point for check-in and weigh-in photos. Picks the in-memory demo
 * backend or the Supabase backend per call, and TypeScript checks that both match.
 */
import "server-only";
import { isDemoMode } from "@/lib/demo";
import * as memory from "./memory/logPhotos";
import * as supabase from "./supabase/logPhotos";

export type { CreateLogPhotoResult } from "./types";

const impl = () => (isDemoMode() ? memory : supabase);

export const listLogPhotos = (...args: Parameters<typeof memory.listLogPhotos>): ReturnType<typeof memory.listLogPhotos> =>
  impl().listLogPhotos(...args);

export const createLogPhoto = (...args: Parameters<typeof memory.createLogPhoto>): ReturnType<typeof memory.createLogPhoto> =>
  impl().createLogPhoto(...args);

export const getLogPhotoFile = (...args: Parameters<typeof memory.getLogPhotoFile>): ReturnType<typeof memory.getLogPhotoFile> =>
  impl().getLogPhotoFile(...args);

export const deleteLogPhoto = (...args: Parameters<typeof memory.deleteLogPhoto>): ReturnType<typeof memory.deleteLogPhoto> =>
  impl().deleteLogPhoto(...args);
