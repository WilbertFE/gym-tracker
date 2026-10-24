import { NextResponse } from "next/server";
import { guard, notFound } from "@/lib/api";
import { finishSession } from "@/lib/repositories/workouts";

/** Ends the workout and stores the duration in minutes. Safe to call twice. */
export async function POST(_req: Request, ctx: RouteContext<"/api/workouts/[id]/finish">) {
  const g = await guard("workouts", { write: true });
  if (g.error) return g.error;

  const { id } = await ctx.params;
  const session = await finishSession(g.userId, id);
  return session ? NextResponse.json({ data: session }) : notFound();
}
