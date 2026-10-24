import { NextResponse } from "next/server";
import { badRequest, guard, notFound } from "@/lib/api";
import { deleteSet, updateSet } from "@/lib/repositories/workouts";
import { setUpdateSchema } from "@/lib/validation/workout";

const SET_WRITES_PER_MINUTE = 90;

export async function PUT(
  request: Request,
  ctx: RouteContext<"/api/workouts/[id]/sets/[setId]">,
) {
  const g = await guard("sets", { write: true, limit: SET_WRITES_PER_MINUTE });
  if (g.error) return g.error;

  const parsed = setUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest();

  const { id, setId } = await ctx.params;
  const set = await updateSet(g.userId, id, setId, parsed.data);
  return set ? NextResponse.json({ data: set }) : notFound();
}

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/workouts/[id]/sets/[setId]">,
) {
  const g = await guard("sets", { write: true, limit: SET_WRITES_PER_MINUTE });
  if (g.error) return g.error;

  const { id, setId } = await ctx.params;
  if (!(await deleteSet(g.userId, id, setId))) return notFound();
  return NextResponse.json({ ok: true });
}
