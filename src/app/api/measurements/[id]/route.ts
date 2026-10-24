import { NextResponse } from "next/server";
import { guard, notFound } from "@/lib/api";
import { deleteMeasurement } from "@/lib/repositories/measurements";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/measurements/[id]">) {
  const g = await guard("measurements", { write: true });
  if (g.error) return g.error;

  const { id } = await ctx.params;
  if (!(await deleteMeasurement(g.userId, id))) return notFound();
  return NextResponse.json({ ok: true });
}
