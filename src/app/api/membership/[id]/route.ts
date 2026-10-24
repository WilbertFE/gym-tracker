import { NextResponse } from "next/server";
import { badRequest, guard, notFound } from "@/lib/api";
import { deleteMembership, updateMembership } from "@/lib/repositories/memberships";
import { membershipSchema } from "@/lib/validation/membership";

export async function PUT(request: Request, ctx: RouteContext<"/api/membership/[id]">) {
  const g = await guard("membership", { write: true });
  if (g.error) return g.error;

  const parsed = membershipSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest();

  const { id } = await ctx.params;
  const row = await updateMembership(g.userId, id, parsed.data);
  return row ? NextResponse.json({ data: row }) : notFound();
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/membership/[id]">) {
  const g = await guard("membership", { write: true });
  if (g.error) return g.error;

  const { id } = await ctx.params;
  if (!(await deleteMembership(g.userId, id))) return notFound();
  return NextResponse.json({ ok: true });
}
