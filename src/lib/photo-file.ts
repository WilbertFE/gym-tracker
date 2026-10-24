/** Largest accepted progress photo. */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** Photos a single user may keep. Guards storage use. */
export const MAX_PHOTOS_PER_USER = 100;

export const PHOTO_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type PhotoMimeType = keyof typeof PHOTO_EXTENSIONS;

/**
 * Identifies an image by its first bytes. The browser supplied content type and
 * file name are never trusted, so a renamed script or HTML file is rejected.
 */
export function detectImageType(bytes: Uint8Array): PhotoMimeType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)
  ) {
    return "image/png";
  }
  // "RIFF" ???? "WEBP"
  if (
    bytes.length >= 12 &&
    [0x52, 0x49, 0x46, 0x46].every((b, i) => bytes[i] === b) &&
    [0x57, 0x45, 0x42, 0x50].every((b, i) => bytes[8 + i] === b)
  ) {
    return "image/webp";
  }
  return null;
}

const EXTENSION_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  // Only the built-in demo placeholders are SVG. Uploads can never be SVG.
  svg: "image/svg+xml",
};

/** Content type for a stored file, from its path extension. */
export function contentTypeForPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TYPES[ext] ?? "application/octet-stream";
}
