import { format, parseISO } from "date-fns";
import Image from "next/image";
import type { ProgressPhoto } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * A private progress photo. It is served by an authenticated API route, so the
 * image optimizer is skipped: it would need to forward the session cookie.
 */
export function PhotoImage({ photo, className }: { photo: ProgressPhoto; className?: string }) {
  const day = format(parseISO(photo.date), "d MMM yyyy");
  return (
    <Image
      src={`/api/photos/${photo.id}/file`}
      alt={`${photo.pose} progress photo from ${day}`}
      width={300}
      height={400}
      unoptimized
      className={cn("aspect-[3/4] w-full border object-cover", className)}
    />
  );
}
