"use client";

import { CameraIcon, ImagesIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { LogPhotoImage } from "@/components/log-photo-image";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api-client";
import { prepareImageForUpload } from "@/lib/image-resize";
import { MAX_LOG_PHOTOS_PER_ENTRY } from "@/lib/photo-file";
import type { LogPhoto, LogPhotoKind } from "@/lib/types";

type EntryPhotosProps = {
  kind: LogPhotoKind;
  entryId: string;
  photos: LogPhoto[];
};

const NOUN: Record<LogPhotoKind, string> = { checkin: "Check-in", weight: "Weigh-in" };

/**
 * Photos on one check-in or weigh-in: thumbnails with delete, plus buttons to
 * take a photo or pick from the gallery. Photos are shrunk and stripped of
 * metadata (location included) in the browser before they are uploaded.
 */
export function EntryPhotos({ kind, entryId, photos }: EntryPhotosProps) {
  const router = useRouter();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const room = MAX_LOG_PHOTOS_PER_ENTRY - photos.length;

  async function onFiles(input: HTMLInputElement) {
    const files = Array.from(input.files ?? []);
    input.value = ""; // So choosing the same photo again still fires a change.
    if (files.length === 0 || busy) return;

    if (room <= 0) {
      toast.error(`You can add up to ${MAX_LOG_PHOTOS_PER_ENTRY} photos. Delete one first.`);
      return;
    }
    const chosen = files.slice(0, room);
    if (files.length > room) toast.message(`Only ${room} more fit. Adding the first ${room}.`);

    setBusy(true);
    let added = 0;
    for (const file of chosen) {
      try {
        const prepared = await prepareImageForUpload(file);
        const form = new FormData();
        form.set("file", prepared);
        form.set("kind", kind);
        form.set("entry_id", entryId);
        const result = await apiRequest("/api/log-photos", "POST", form);
        if (result.ok) {
          added += 1;
        } else {
          toast.error(result.error);
          break;
        }
      } catch (error) {
        toast.error(
          error instanceof Error && error.message === "too-large"
            ? "That photo is larger than 25 MB."
            : "Could not read that photo. Try a JPEG or PNG.",
        );
      }
    }
    setBusy(false);
    if (added > 0) {
      toast.success(added === 1 ? "Photo added" : `${added} photos added`);
      router.refresh();
    }
  }

  async function remove(id: string) {
    if (deletingId) return;
    setDeletingId(id);
    const result = await apiRequest(`/api/log-photos/${id}`, "DELETE");
    setDeletingId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Photo deleted");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[11px] uppercase tracking-widest text-muted-foreground">
          {NOUN[kind]} photos
        </h4>
        <span className="tabular text-[11px] text-muted-foreground">
          {photos.length} of {MAX_LOG_PHOTOS_PER_ENTRY}
        </span>
      </div>

      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((photo, index) => (
            <li key={photo.id} className="flex flex-col gap-1">
              <a
                href={`/api/log-photos/${photo.id}/file`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${NOUN[kind].toLowerCase()} photo ${index + 1} in a new tab`}
              >
                <LogPhotoImage id={photo.id} alt={`${NOUN[kind]} photo ${index + 1}`} />
              </a>
              <ConfirmDialog
                title="Delete this photo?"
                description="The photo is removed for good."
                confirmLabel="Delete photo"
                destructive
                onConfirm={() => remove(photo.id)}
                trigger={
                  <button
                    type="button"
                    disabled={deletingId === photo.id}
                    aria-label={`Delete ${NOUN[kind].toLowerCase()} photo ${index + 1}`}
                    className="min-h-11 self-start px-2 text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
                  >
                    {deletingId === photo.id ? "Deleting" : "Delete"}
                  </button>
                }
              />
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-11"
          disabled={busy || room <= 0}
          onClick={() => cameraRef.current?.click()}
        >
          <CameraIcon className="size-4" aria-hidden />
          {busy ? "Uploading" : "Take photo"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11"
          disabled={busy || room <= 0}
          onClick={() => galleryRef.current?.click()}
        >
          <ImagesIcon className="size-4" aria-hidden />
          Choose photos
        </Button>
      </div>

      {/* Visually hidden, opened by the buttons above. `capture` opens the camera on phones. */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture
        className="sr-only"
        tabIndex={-1}
        aria-label={`Take a ${NOUN[kind].toLowerCase()} photo with the camera`}
        onChange={(e) => void onFiles(e.currentTarget)}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-label={`Choose ${NOUN[kind].toLowerCase()} photos from your files`}
        onChange={(e) => void onFiles(e.currentTarget)}
      />
    </div>
  );
}
