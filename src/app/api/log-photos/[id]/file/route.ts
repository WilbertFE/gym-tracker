import { guard, notFound } from "@/lib/api";
import { privatePhotoResponse } from "@/lib/photo-response";
import { getLogPhotoFile } from "@/lib/repositories/logPhotos";

/** Streams a private check-in or weigh-in photo to its owner. Every request is authenticated. */
export async function GET(_req: Request, ctx: RouteContext<"/api/log-photos/[id]/file">) {
  const g = await guard("log-photos", { write: false });
  if (g.error) return g.error;

  const { id } = await ctx.params;
  const file = await getLogPhotoFile(g.userId, id);
  return file ? privatePhotoResponse(file) : notFound();
}
