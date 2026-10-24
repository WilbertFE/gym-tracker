import { NextResponse } from "next/server";
import { guard, notFound } from "@/lib/api";
import { deleteLogPhoto } from "@/lib/repositories/logPhotos";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/log-photos/[id]">) {
  const g = await guard("log-photos", { write: true });
  if (g.error) return g.error;

  const { id } = await ctx.params;
  if (!(await deleteLogPhoto(g.userId, id))) return notFound();
  return NextResponse.json({ ok: true });
}
