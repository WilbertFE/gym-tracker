import { NextResponse } from "next/server";
import { badRequest, guard } from "@/lib/api";
import { createWeight, listWeights } from "@/lib/repositories/weights";
import { weightSchema } from "@/lib/validation/weight";

export async function GET() {
  const g = await guard("weights", { write: false });
  if (g.error) return g.error;
  return NextResponse.json({ data: await listWeights(g.userId) });
}

export async function POST(request: Request) {
  const g = await guard("weights", { write: true });
  if (g.error) return g.error;

  const parsed = weightSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest();

  return NextResponse.json({ data: await createWeight(g.userId, parsed.data) }, { status: 201 });
}
