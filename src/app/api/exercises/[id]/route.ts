import { NextResponse } from "next/server";
import { guard, notFound } from "@/lib/api";
import { deleteExercise } from "@/lib/repositories/exercises";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/exercises/[id]">) {
  const g = await guard("exercises", { write: true });
  if (g.error) return g.error;

  const { id } = await ctx.params;
  const result = await deleteExercise(g.userId, id);

  if (result === "deleted") return NextResponse.json({ ok: true });
  if (result === "built_in") {
    return NextResponse.json({ error: "Built-in exercises cannot be deleted" }, { status: 403 });
  }
  if (result === "in_use") {
    return NextResponse.json(
      { error: "This exercise is used in a workout and cannot be deleted" },
      { status: 409 },
    );
  }
  return notFound();
}
