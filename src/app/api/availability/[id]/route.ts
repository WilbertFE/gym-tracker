import { NextResponse } from "next/server";
import { badRequest, guard, notFound } from "@/lib/api";
import { deleteAvailability, updateAvailability } from "@/lib/repositories/availability";
import { availabilitySchema } from "@/lib/validation/availability";

export async function PUT(request: Request, ctx: RouteContext<"/api/availability/[id]">) {
  const g = await guard("availability", { write: true });
  if (g.error) return g.error;

  const parsed = availabilitySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest();

  const { id } = await ctx.params;
  const row = await updateAvailability(g.userId, id, parsed.data);
  return row ? NextResponse.json({ data: row }) : notFound();
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/availability/[id]">) {
  const g = await guard("availability", { write: true });
  if (g.error) return g.error;

  const { id } = await ctx.params;
  if (!(await deleteAvailability(g.userId, id))) return notFound();
  return NextResponse.json({ ok: true });
}
