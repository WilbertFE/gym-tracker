import { NextResponse } from "next/server";
import { guard, notFound } from "@/lib/api";
import { deleteCheckin } from "@/lib/repositories/checkins";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/checkins/[id]">) {
  const g = await guard("checkins", { write: true });
  if (g.error) return g.error;

  const { id } = await ctx.params;
  if (!(await deleteCheckin(g.userId, id))) return notFound();
  return NextResponse.json({ ok: true });
}
