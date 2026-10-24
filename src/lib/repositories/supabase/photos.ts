import "server-only";
import {
  contentTypeForPath,
  MAX_PHOTOS_PER_USER,
  PHOTO_EXTENSIONS,
  type PhotoMimeType,
} from "@/lib/photo-file";
import type { PhotoPose, ProgressPhoto } from "@/lib/types";
import type { CreatePhotoResult } from "../types";
import { check, fetchAll, getDb, isUuid } from "./db";

/** Private bucket created by the initial migration. It must never be made public. */
const BUCKET = "progress-photos";
const COLUMNS = "id,user_id,date,storage_path,pose";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toPhoto = (r: any): ProgressPhoto => ({
  id: r.id,
  user_id: r.user_id,
  date: r.date,
  storage_path: r.storage_path,
  pose: r.pose,
});

/** Newest first. Only metadata: files are read through getPhotoFile. */
export async function listPhotos(userId: string): Promise<ProgressPhoto[]> {
  const db = await getDb();
  const rows = await fetchAll((from, to) =>
    db
      .from("progress_photos")
      .select(COLUMNS)
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .order("pose")
      .order("id")
      .range(from, to),
  );
  return rows.map(toPhoto);
}

/**
 * Uploads to `<user id>/<photo id>.<ext>`. The storage policy only lets a user
 * touch files whose first folder is their own id.
 */
export async function createPhoto(
  userId: string,
  meta: { date: string; pose: PhotoPose },
  bytes: Uint8Array,
  mimeType: PhotoMimeType,
): Promise<CreatePhotoResult> {
  const db = await getDb();

  const { count, error: countError } = await db
    .from("progress_photos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  check(countError);
  if ((count ?? 0) >= MAX_PHOTOS_PER_USER) return { ok: false, reason: "limit_reached" };

  const id = crypto.randomUUID();
  const storage_path = `${userId}/${id}.${PHOTO_EXTENSIONS[mimeType]}`;

  const { error: uploadError } = await db.storage
    .from(BUCKET)
    .upload(storage_path, bytes, { contentType: mimeType, upsert: false });
  check(uploadError);

  const { data, error } = await db
    .from("progress_photos")
    .insert({ id, user_id: userId, date: meta.date, pose: meta.pose, storage_path })
    .select(COLUMNS)
    .single();
  if (error) {
    // Do not leave an orphaned file behind.
    await db.storage.from(BUCKET).remove([storage_path]);
    check(error);
  }
  return { ok: true, photo: toPhoto(data) };
}

export async function getPhotoFile(
  userId: string,
  id: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  if (!isUuid(id)) return null;
  const db = await getDb();
  const { data: row, error } = await db
    .from("progress_photos")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  check(error);
  if (!row) return null;

  const { data: blob, error: downloadError } = await db.storage.from(BUCKET).download(row.storage_path);
  if (downloadError || !blob) return null;

  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    // Derive the type from the stored extension, which only ever comes from magic byte detection.
    contentType: contentTypeForPath(row.storage_path),
  };
}

export async function deletePhoto(userId: string, id: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  const db = await getDb();
  const { data: row, error } = await db
    .from("progress_photos")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  check(error);
  if (!row) return false;

  const { error: removeError } = await db.storage.from(BUCKET).remove([row.storage_path]);
  check(removeError);

  const { error: deleteError } = await db.from("progress_photos").delete().eq("id", id).eq("user_id", userId);
  check(deleteError);
  return true;
}
