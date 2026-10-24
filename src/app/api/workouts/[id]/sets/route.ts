import { NextResponse } from "next/server";
import { badRequest, guard, notFound } from "@/lib/api";
import { addSet } from "@/lib/repositories/workouts";
import { setSchema } from "@/lib/validation/workout";

// Logging sets happens mid workout, so allow more writes than the default.
const SET_WRITES_PER_MINUTE = 90;

export async function POST(request: Request, ctx: RouteContext<"/api/workouts/[id]/sets">) {
  const g = await guard("sets", { write: true, limit: SET_WRITES_PER_MINUTE });
  if (g.error) return g.error;

  const parsed = setSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest();

  const { id } = await ctx.params;
  const result = await addSet(g.userId, id, parsed.data);
  if (result.ok) return NextResponse.json({ data: result.set }, { status: 201 });
  return result.reason === "session_not_found" ? notFound() : badRequest("Unknown exercise");
}
