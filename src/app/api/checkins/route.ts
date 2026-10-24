import { NextResponse } from "next/server";
import { badRequest, guard } from "@/lib/api";
import { listCheckins, upsertCheckin } from "@/lib/repositories/checkins";
import { checkinSchema } from "@/lib/validation/checkin";

export async function GET() {
  const g = await guard("checkins", { write: false });
  if (g.error) return g.error;
  return NextResponse.json({ data: await listCheckins(g.userId) });
}

/** Creates or replaces the check-in for the given date. */
export async function POST(request: Request) {
  const g = await guard("checkins", { write: true });
  if (g.error) return g.error;

  const parsed = checkinSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest();

  return NextResponse.json({ data: await upsertCheckin(g.userId, parsed.data) });
}
