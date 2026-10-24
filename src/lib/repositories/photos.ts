import "server-only";
import {
  contentTypeForPath,
  MAX_PHOTOS_PER_USER,
  PHOTO_EXTENSIONS,
  type PhotoMimeType,
} from "@/lib/photo-file";
import type { PhotoPose, ProgressPhoto } from "@/lib/types";
import { getStore } from "./store";

/** Newest first. Only metadata: files are read through getPhotoFile. */
export async function listPhotos(userId: string): Promise<ProgressPhoto[]> {
  return [...getStore(userId).photos].sort(
    (a, b) => b.date.localeCompare(a.date) || a.pose.localeCompare(b.pose),
  );
}

export type CreatePhotoResult =
  | { ok: true; photo: ProgressPhoto }
  | { ok: false; reason: "limit_reached" };

/**
 * Stores the bytes under `<user id>/<photo id>.<ext>`, the same layout the
 * private Supabase Storage bucket policy expects (first folder is the user id).
 */
export async function createPhoto(
  userId: string,
  meta: { date: string; pose: PhotoPose },
  bytes: Uint8Array,
  mimeType: PhotoMimeType,
): Promise<CreatePhotoResult> {
  const store = getStore(userId);
  if (store.photos.length >= MAX_PHOTOS_PER_USER) return { ok: false, reason: "limit_reached" };

  const id = crypto.randomUUID();
  const storage_path = `${userId}/${id}.${PHOTO_EXTENSIONS[mimeType]}`;
  const photo: ProgressPhoto = { id, user_id: userId, date: meta.date, pose: meta.pose, storage_path };

  store.files.set(storage_path, { bytes, contentType: mimeType });
  store.photos.push(photo);
  return { ok: true, photo };
}

export async function getPhotoFile(
  userId: string,
  id: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  const store = getStore(userId);
  const photo = store.photos.find((p) => p.id === id);
  if (!photo) return null;
  const file = store.files.get(photo.storage_path);
  return file
    ? { bytes: file.bytes, contentType: file.contentType || contentTypeForPath(photo.storage_path) }
    : null;
}

export async function deletePhoto(userId: string, id: string): Promise<boolean> {
  const store = getStore(userId);
  const photo = store.photos.find((p) => p.id === id);
  if (!photo) return false;
  store.files.delete(photo.storage_path);
  store.photos = store.photos.filter((p) => p.id !== id);
  return true;
}
