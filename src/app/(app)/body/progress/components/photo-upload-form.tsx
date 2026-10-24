"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { SegmentedControl } from "@/components/segmented-control";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api-client";
import { MAX_PHOTO_BYTES, PHOTO_EXTENSIONS } from "@/lib/photo-file";
import type { PhotoPose } from "@/lib/types";

const labelClass = "text-[11px] uppercase tracking-widest text-muted-foreground";
const ACCEPTED = Object.keys(PHOTO_EXTENSIONS);

export function PhotoUploadForm({ today }: { today: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pose, setPose] = useState<PhotoPose>("front");
  const [date, setDate] = useState(today);
  const [uploading, setUploading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (uploading) return;

    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose a photo first");
      return;
    }
    // Quick checks for a friendly message. The server re-checks everything.
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Only JPEG, PNG or WebP photos are accepted");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error("Photo is larger than 5 MB");
      return;
    }

    const form = new FormData();
    form.set("file", file);
    form.set("date", date);
    form.set("pose", pose);

    setUploading(true);
    const result = await apiRequest("/api/photos", "POST", form);
    setUploading(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Photo uploaded");
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor="photo-file" className={labelClass}>Photo (JPEG, PNG or WebP, up to 5 MB)</Label>
        <Input
          id="photo-file"
          ref={fileRef}
          type="file"
          accept={ACCEPTED.join(",")}
          className="h-11 pt-2"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="photo-date" className={labelClass}>Date</Label>
        <Input
          id="photo-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="tabular h-11"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className={labelClass}>Pose</span>
        <SegmentedControl
          label="Pose"
          value={pose}
          onChange={setPose}
          className="w-full"
          options={[
            { value: "front", label: "Front" },
            { value: "side", label: "Side" },
            { value: "back", label: "Back" },
          ]}
        />
      </div>

      <Button type="submit" className="h-11 sm:col-span-2" disabled={uploading}>
        {uploading ? "Uploading" : "Upload photo"}
      </Button>
    </form>
  );
}
