import { NextResponse } from "next/server";
import { guard, notFound } from "@/lib/api";
import { deletePhoto } from "@/lib/repositories/photos";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/photos/[id]">) {
  const g = await guard("photos", { write: true });
  if (g.error) return g.error;

  const { id } = await ctx.params;
  if (!(await deletePhoto(g.userId, id))) return notFound();
  return NextResponse.json({ ok: true });
}
