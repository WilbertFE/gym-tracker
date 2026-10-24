import { guard, notFound } from "@/lib/api";
import { privatePhotoResponse } from "@/lib/photo-response";
import { getPhotoFile } from "@/lib/repositories/photos";

/** Streams a private progress photo to its owner. Every request is authenticated. */
export async function GET(_req: Request, ctx: RouteContext<"/api/photos/[id]/file">) {
  const g = await guard("photos", { write: false });
  if (g.error) return g.error;

  const { id } = await ctx.params;
  const file = await getPhotoFile(g.userId, id);
  return file ? privatePhotoResponse(file) : notFound();
}
