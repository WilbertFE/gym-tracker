import { NextResponse } from "next/server";
import { badRequest, guard } from "@/lib/api";
import { createMembership, listMemberships } from "@/lib/repositories/memberships";
import { membershipSchema } from "@/lib/validation/membership";

export async function GET() {
  const g = await guard("membership", { write: false });
  if (g.error) return g.error;
  return NextResponse.json({ data: await listMemberships(g.userId) });
}

export async function POST(request: Request) {
  const g = await guard("membership", { write: true });
  if (g.error) return g.error;

  const parsed = membershipSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest();

  return NextResponse.json(
    { data: await createMembership(g.userId, parsed.data) },
    { status: 201 },
  );
}
