import { NextResponse } from "next/server";
import { badRequest, guard } from "@/lib/api";
import { listSessions, startSession } from "@/lib/repositories/workouts";
import { startSessionSchema } from "@/lib/validation/workout";

export async function GET() {
  const g = await guard("workouts", { write: false });
  if (g.error) return g.error;
  return NextResponse.json({ data: await listSessions(g.userId) });
}

/**
 * Starts a workout. Only one can be in progress: if one is already active it
 * is returned with 200 instead of creating a second.
 */
export async function POST(request: Request) {
  const g = await guard("workouts", { write: true });
  if (g.error) return g.error;

  // The body is optional.
  const raw = (await request.text()).trim();
  let body: unknown = {};
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      return badRequest();
    }
  }
  const parsed = startSessionSchema.safeParse(body);
  if (!parsed.success) return badRequest();

  const { session, created } = await startSession(g.userId, parsed.data.notes ?? null);
  return NextResponse.json(
    { data: session, already_active: !created },
    { status: created ? 201 : 200 },
  );
}
