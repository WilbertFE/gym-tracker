import { NextResponse } from "next/server";
import { badRequest, guard } from "@/lib/api";
import { createAvailability, listAvailability } from "@/lib/repositories/availability";
import { availabilitySchema } from "@/lib/validation/availability";

/** Recurring weekly commitments, Monday first. weekday: 0 = Sunday ... 6 = Saturday. */
export async function GET() {
  const g = await guard("availability", { write: false });
  if (g.error) return g.error;
  return NextResponse.json({ data: await listAvailability(g.userId) });
}

export async function POST(request: Request) {
  const g = await guard("availability", { write: true });
  if (g.error) return g.error;

  const parsed = availabilitySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest();

  return NextResponse.json({ data: await createAvailability(g.userId, parsed.data) }, { status: 201 });
}
