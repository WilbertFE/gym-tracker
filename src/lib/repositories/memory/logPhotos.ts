import "server-only";
import {
  MAX_LOG_PHOTOS_PER_ENTRY,
  MAX_LOG_PHOTOS_PER_USER,
  PHOTO_EXTENSIONS,
  contentTypeForPath,
  type PhotoMimeType,
} from "@/lib/photo-file";
import type { LogPhoto, LogPhotoKind } from "@/lib/types";
import type { CreateLogPhotoResult } from "../types";
import { getStore } from "./store";

const parentOf = (p: LogPhoto) => p.checkin_id ?? p.weight_id;

/** Newest first. Pass a kind and entry id to list one entry's photos. Metadata only. */
export async function listLogPhotos(
  userId: string,
  filter?: { kind?: LogPhotoKind; entryId?: string },
): Promise<LogPhoto[]> {
  return getStore(userId)
    .logPhotos.filter((p) => {
      if (filter?.kind === "checkin" && p.checkin_id === null) return false;
      if (filter?.kind === "weight" && p.weight_id === null) return false;
      if (filter?.entryId && parentOf(p) !== filter.entryId) return false;
      return true;
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id));
}

export async function createLogPhoto(
  userId: string,
  target: { kind: LogPhotoKind; entryId: string },
  bytes: Uint8Array,
  mimeType: PhotoMimeType,
): Promise<CreateLogPhotoResult> {
  const store = getStore(userId);
  const exists =
    target.kind === "checkin"
      ? store.checkins.some((c) => c.id === target.entryId)
      : store.weights.some((w) => w.id === target.entryId);
  if (!exists) return { ok: false, reason: "entry_not_found" };

  const onEntry = store.logPhotos.filter((p) => parentOf(p) === target.entryId).length;
  if (onEntry >= MAX_LOG_PHOTOS_PER_ENTRY || store.logPhotos.length >= MAX_LOG_PHOTOS_PER_USER) {
    return { ok: false, reason: "limit_reached" };
  }

  const id = crypto.randomUUID();
  const storage_path = `${userId}/log/${id}.${PHOTO_EXTENSIONS[mimeType]}`;
  const photo: LogPhoto = {
    id,
    user_id: userId,
    checkin_id: target.kind === "checkin" ? target.entryId : null,
    weight_id: target.kind === "weight" ? target.entryId : null,
    storage_path,
    created_at: new Date().toISOString(),
  };
  store.files.set(storage_path, { bytes, contentType: mimeType });
  store.logPhotos.push(photo);
  return { ok: true, photo };
}

export async function getLogPhotoFile(
  userId: string,
  id: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  const store = getStore(userId);
  const photo = store.logPhotos.find((p) => p.id === id);
  if (!photo) return null;
  const file = store.files.get(photo.storage_path);
  return file
    ? { bytes: file.bytes, contentType: file.contentType || contentTypeForPath(photo.storage_path) }
    : null;
}

export async function deleteLogPhoto(userId: string, id: string): Promise<boolean> {
  const store = getStore(userId);
  const photo = store.logPhotos.find((p) => p.id === id);
  if (!photo) return false;
  store.files.delete(photo.storage_path);
  store.logPhotos = store.logPhotos.filter((p) => p.id !== id);
  return true;
}
