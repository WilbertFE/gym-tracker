import { NextResponse } from "next/server";
import { badRequest, guard, notFound } from "@/lib/api";
import { todayISO } from "@/lib/dates";
import { acceptLink, removeLink } from "@/lib/repositories/friends";
import { friendActionSchema } from "@/lib/validation/friends";

/** Accepts a request someone sent you. Only the player it was sent to can accept it. */
export async function PUT(request: Request, ctx: RouteContext<"/api/friends/[id]">) {
  const g = await guard("friends-update", { write: true });
  if (g.error) return g.error;

  if (!friendActionSchema.safeParse(await request.json().catch(() => null)).success) return badRequest();
  const { id } = await ctx.params;
  const result = await acceptLink(g.userId, id, todayISO());
  if (result === "not_found") return notFound();
  if (result === "full") {
    return NextResponse.json({ error: "One of you has all the friends the game allows.", code: "friend_limit" }, { status: 409 });
  }
  return NextResponse.json({ data: { status: "accepted" } });
}

/** Removes a friend, declines a request or takes back one you sent. Either side can do it. */
export async function DELETE(_req: Request, ctx: RouteContext<"/api/friends/[id]">) {
  const g = await guard("friends-update", { write: true });
  if (g.error) return g.error;

  const { id } = await ctx.params;
  if (!(await removeLink(g.userId, id))) return notFound();
  return NextResponse.json({ data: { removed: true } });
}
