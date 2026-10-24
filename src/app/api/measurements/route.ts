import { NextResponse } from "next/server";
import { badRequest, guard } from "@/lib/api";
import { listMeasurements, upsertMeasurement } from "@/lib/repositories/measurements";
import { measurementSchema } from "@/lib/validation/progress";

export async function GET() {
  const g = await guard("measurements", { write: false });
  if (g.error) return g.error;
  return NextResponse.json({ data: await listMeasurements(g.userId) });
}

/** Creates or replaces the measurements for the given date. At least one value is required. */
export async function POST(request: Request) {
  const g = await guard("measurements", { write: true });
  if (g.error) return g.error;

  const parsed = measurementSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest();

  return NextResponse.json({ data: await upsertMeasurement(g.userId, parsed.data) });
}
