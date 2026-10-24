/** Longest side of an uploaded check-in or weigh-in photo, in pixels. */
export const MAX_IMAGE_EDGE = 1600;
export const JPEG_QUALITY = 0.85;
/** Camera originals can be large. Anything past this is refused before decoding. */
export const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

/** Scales a size down to fit `max` on its longest side, keeping the aspect ratio. Never scales up. */
export function fitWithin(width: number, height: number, max = MAX_IMAGE_EDGE): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const scale = max / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Browser only. Decodes the photo, applies its camera rotation, shrinks it and
 * re-encodes it as JPEG. Re-encoding drops all metadata, including the GPS
 * position and device details a phone writes into the original.
 * Throws if the browser cannot decode the file.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (file.size > MAX_SOURCE_BYTES) throw new Error("too-large");

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no-canvas");

    // JPEG has no transparency, so transparent PNG areas become white instead of black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob) throw new Error("encode-failed");

    const base = file.name.replace(/\.[^.]*$/, "").slice(0, 60) || "photo";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}
