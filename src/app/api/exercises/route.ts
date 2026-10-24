import { NextResponse } from "next/server";
import { badRequest, guard } from "@/lib/api";
import { createExercise, listExercises } from "@/lib/repositories/exercises";
import { exerciseSchema } from "@/lib/validation/workout";

export async function GET() {
  const g = await guard("exercises", { write: false });
  if (g.error) return g.error;
  return NextResponse.json({ data: await listExercises(g.userId) });
}

/** Creates a custom exercise for the signed in user. */
export async function POST(request: Request) {
  const g = await guard("exercises", { write: true });
  if (g.error) return g.error;

  const parsed = exerciseSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest();

  return NextResponse.json({ data: await createExercise(g.userId, parsed.data) }, { status: 201 });
}
