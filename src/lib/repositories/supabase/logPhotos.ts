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
import { check, fetchAll, getDb, isUuid } from "./db";

/** Same private bucket as progress photos. Files go under <user id>/log/. */
const BUCKET = "progress-photos";
const COLUMNS = "id,user_id,checkin_id,weight_id,storage_path,created_at";

const parentColumn = (kind: LogPhotoKind) => (kind === "checkin" ? "checkin_id" : "weight_id");
const parentTable = (kind: LogPhotoKind) => (kind === "checkin" ? "daily_checkins" : "weight_logs");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toLogPhoto = (r: any): LogPhoto => ({
  id: r.id,
  user_id: r.user_id,
  checkin_id: r.checkin_id,
  weight_id: r.weight_id,
  storage_path: r.storage_path,
  created_at: r.created_at,
});

/** Newest first. Pass a kind and entry id to list one entry's photos. Metadata only. */
export async function listLogPhotos(
  userId: string,
  filter?: { kind?: LogPhotoKind; entryId?: string },
): Promise<LogPhoto[]> {
  if (filter?.entryId && !isUuid(filter.entryId)) return [];

  const db = await getDb();
  const rows = await fetchAll((from, to) => {
    let query = db.from("log_photos").select(COLUMNS).eq("user_id", userId);
    if (filter?.kind === "checkin") query = query.not("checkin_id", "is", null);
    if (filter?.kind === "weight") query = query.not("weight_id", "is", null);
    if (filter?.entryId) {
      query = query.eq(filter.kind ? parentColumn(filter.kind) : "checkin_id", filter.entryId);
    }
    return query.order("created_at", { ascending: false }).order("id").range(from, to);
  });
  return rows.map(toLogPhoto);
}

/** Storage paths of every photo on one entry. Call before deleting the entry. */
export async function listEntryFilePaths(
  userId: string,
  kind: LogPhotoKind,
  entryId: string,
): Promise<string[]> {
  const db = await getDb();
  const { data, error } = await db
    .from("log_photos")
    .select("storage_path")
    .eq("user_id", userId)
    .eq(parentColumn(kind), entryId);
  check(error);
  return (data ?? []).map((r) => r.storage_path as string);
}

/** Removes files from the private bucket. The database rows go with their entry (on delete cascade). */
export async function removeStoredFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const db = await getDb();
  const { error } = await db.storage.from(BUCKET).remove(paths);
  check(error);
}

export async function createLogPhoto(
  userId: string,
  target: { kind: LogPhotoKind; entryId: string },
  bytes: Uint8Array,
  mimeType: PhotoMimeType,
): Promise<CreateLogPhotoResult> {
  if (!isUuid(target.entryId)) return { ok: false, reason: "entry_not_found" };
  const db = await getDb();

  const { data: entry, error: entryError } = await db
    .from(parentTable(target.kind))
    .select("id")
    .eq("id", target.entryId)
    .eq("user_id", userId)
    .maybeSingle();
  check(entryError);
  if (!entry) return { ok: false, reason: "entry_not_found" };

  const [onEntry, total] = await Promise.all([
    db
      .from("log_photos")
      .select("id", { count: "exact", head: true })
      .eq(parentColumn(target.kind), target.entryId),
    db.from("log_photos").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  check(onEntry.error);
  check(total.error);
  if ((onEntry.count ?? 0) >= MAX_LOG_PHOTOS_PER_ENTRY || (total.count ?? 0) >= MAX_LOG_PHOTOS_PER_USER) {
    return { ok: false, reason: "limit_reached" };
  }

  const id = crypto.randomUUID();
  const storage_path = `${userId}/log/${id}.${PHOTO_EXTENSIONS[mimeType]}`;

  const { error: uploadError } = await db.storage
    .from(BUCKET)
    .upload(storage_path, bytes, { contentType: mimeType, upsert: false });
  check(uploadError);

  const { data, error } = await db
    .from("log_photos")
    .insert({
      id,
      user_id: userId,
      checkin_id: target.kind === "checkin" ? target.entryId : null,
      weight_id: target.kind === "weight" ? target.entryId : null,
      storage_path,
    })
    .select(COLUMNS)
    .single();
  if (error) {
    // Do not leave an orphaned file behind.
    await db.storage.from(BUCKET).remove([storage_path]);
    check(error);
  }
  return { ok: true, photo: toLogPhoto(data) };
}

export async function getLogPhotoFile(
  userId: string,
  id: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  if (!isUuid(id)) return null;
  const db = await getDb();
  const { data: row, error } = await db
    .from("log_photos")
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
    // The extension only ever comes from magic byte detection.
    contentType: contentTypeForPath(row.storage_path),
  };
}

export async function deleteLogPhoto(userId: string, id: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  const db = await getDb();
  const { data: row, error } = await db
    .from("log_photos")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  check(error);
  if (!row) return false;

  await removeStoredFiles([row.storage_path]);
  const { error: deleteError } = await db.from("log_photos").delete().eq("id", id).eq("user_id", userId);
  check(deleteError);
  return true;
}
