import { NextResponse } from "next/server";
import { badRequest, guard, notFound } from "@/lib/api";
import {
  deleteSession,
  getSessionWithSets,
  updateSessionNotes,
} from "@/lib/repositories/workouts";
import { sessionNotesSchema } from "@/lib/validation/workout";

export async function GET(_req: Request, ctx: RouteContext<"/api/workouts/[id]">) {
  const g = await guard("workouts", { write: false });
  if (g.error) return g.error;

  const { id } = await ctx.params;
  const found = await getSessionWithSets(g.userId, id);
  return found ? NextResponse.json({ data: found }) : notFound();
}

/** Updates the session notes. */
export async function PUT(request: Request, ctx: RouteContext<"/api/workouts/[id]">) {
  const g = await guard("workouts", { write: true });
  if (g.error) return g.error;

  const parsed = sessionNotesSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest();

  const { id } = await ctx.params;
  const session = await updateSessionNotes(g.userId, id, parsed.data.notes ?? null);
  return session ? NextResponse.json({ data: session }) : notFound();
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/workouts/[id]">) {
  const g = await guard("workouts", { write: true });
  if (g.error) return g.error;

  const { id } = await ctx.params;
  if (!(await deleteSession(g.userId, id))) return notFound();
  return NextResponse.json({ ok: true });
}
