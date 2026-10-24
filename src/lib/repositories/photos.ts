/**
 * Public entry point for photos data. Picks the in-memory demo backend or the
 * Supabase backend per call, and TypeScript checks that both match.
 */
import "server-only";
import { isDemoMode } from "@/lib/demo";
import * as memory from "./memory/photos";
import * as supabase from "./supabase/photos";

export type { CreatePhotoResult } from "./types";

const impl = () => (isDemoMode() ? memory : supabase);

export const listPhotos = (...args: Parameters<typeof memory.listPhotos>): ReturnType<typeof memory.listPhotos> =>
  impl().listPhotos(...args);

export const createPhoto = (...args: Parameters<typeof memory.createPhoto>): ReturnType<typeof memory.createPhoto> =>
  impl().createPhoto(...args);

export const getPhotoFile = (...args: Parameters<typeof memory.getPhotoFile>): ReturnType<typeof memory.getPhotoFile> =>
  impl().getPhotoFile(...args);

export const deletePhoto = (...args: Parameters<typeof memory.deletePhoto>): ReturnType<typeof memory.deletePhoto> =>
  impl().deletePhoto(...args);
