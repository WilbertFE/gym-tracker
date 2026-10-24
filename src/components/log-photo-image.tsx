import Image from "next/image";
import { cn } from "@/lib/utils";

type LogPhotoImageProps = {
  id: string;
  alt: string;
  className?: string;
};

/**
 * A private check-in or weigh-in photo. It is served by an authenticated API
 * route, so the image optimizer is skipped: it would need the session cookie.
 */
export function LogPhotoImage({ id, alt, className }: LogPhotoImageProps) {
  return (
    <Image
      src={`/api/log-photos/${id}/file`}
      alt={alt}
      width={400}
      height={400}
      unoptimized
      className={cn("aspect-square w-full border object-cover", className)}
    />
  );
}
