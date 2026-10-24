import "server-only";

/**
 * Streams a private photo to its owner. There is no public URL: callers must
 * have authenticated the request first. The headers keep shared caches away,
 * stop type sniffing and sandbox the response if it were ever opened directly.
 */
export function privatePhotoResponse(file: { bytes: Uint8Array; contentType: string }): Response {
  return new Response(file.bytes as BodyInit, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.bytes.byteLength),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Content-Disposition": "inline",
    },
  });
}
