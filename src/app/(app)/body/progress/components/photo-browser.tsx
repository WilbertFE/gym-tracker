"use client";

import { format, parseISO } from "date-fns";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { SegmentedControl } from "@/components/segmented-control";
import { apiRequest } from "@/lib/api-client";
import type { PhotoPose, ProgressPhoto } from "@/lib/types";
import { PhotoImage } from "./photo-image";

type Filter = PhotoPose | "all";

/** Gallery of all photos, newest first, with a pose filter and a two step delete. */
export function PhotoBrowser({ photos }: { photos: ProgressPhoto[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const visible = filter === "all" ? photos : photos.filter((p) => p.pose === filter);

  async function remove(id: string) {
    if (busyId) return;
    setBusyId(id);
    const result = await apiRequest(`/api/photos/${id}`, "DELETE");
    setBusyId(null);
    setConfirmId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Photo deleted");
    router.refresh();
  }

  if (photos.length === 0) {
    return <p className="text-sm text-muted-foreground">No photos yet. Upload your first one above.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        label="Filter by pose"
        value={filter}
        onChange={(v) => {
          setFilter(v);
          setConfirmId(null);
        }}
        options={[
          { value: "all", label: "All" },
          { value: "front", label: "Front" },
          { value: "side", label: "Side" },
          { value: "back", label: "Back" },
        ]}
      />

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No {filter} photos yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((photo) => (
            <li key={photo.id} className="flex flex-col gap-2">
              <PhotoImage photo={photo} />
              <div className="flex items-center justify-between gap-2">
                <p className="tabular text-xs">
                  {format(parseISO(photo.date), "d MMM yyyy")}
                  <span className="ml-2 uppercase text-muted-foreground">{photo.pose}</span>
                </p>
                {confirmId === photo.id ? (
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => remove(photo.id)}
                      disabled={busyId === photo.id}
                      className="min-h-11 px-2 text-xs text-destructive disabled:opacity-50"
                    >
                      {busyId === photo.id ? "Deleting" : "Confirm"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="min-h-11 px-2 text-xs text-muted-foreground"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmId(photo.id)}
                    aria-label={`Delete ${photo.pose} photo from ${format(parseISO(photo.date), "d MMM yyyy")}`}
                    className="min-h-11 px-2 text-xs text-muted-foreground hover:text-destructive"
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
