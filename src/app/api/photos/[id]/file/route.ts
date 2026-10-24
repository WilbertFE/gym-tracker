import { guard, notFound } from "@/lib/api";
import { getPhotoFile } from "@/lib/repositories/photos";

/**
 * Streams a private photo to its owner. There is no public URL: every request
 * is authenticated and scoped to the signed in user.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/photos/[id]/file">) {
  const g = await guard("photos", { write: false });
  if (g.error) return g.error;

  const { id } = await ctx.params;
  const file = await getPhotoFile(g.userId, id);
  if (!file) return notFound();

  return new Response(file.bytes as BodyInit, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.bytes.byteLength),
      // Private data: never cache in shared caches, never sniff, never run as a document.
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Content-Disposition": "inline",
    },
  });
}
