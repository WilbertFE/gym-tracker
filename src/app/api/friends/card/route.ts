import { NextResponse } from "next/server";
import { badRequest, guard } from "@/lib/api";
import { ensureFriendCard } from "@/lib/friends-server";
import { validateDisplayName } from "@/lib/leaderboard";
import { loadLevel } from "@/lib/level";
import { deleteCard, getCard, updateCard } from "@/lib/repositories/friends";
import { friendNameSchema } from "@/lib/validation/friends";

/** Opens the Friends feature for you: your friend code and the name friends see. Asking again returns the same card. */
export async function POST() {
  const g = await guard("friends-card", { write: true, limit: 10 });
  if (g.error) return g.error;

  const { level } = await loadLevel(g.userId);
  const result = await ensureFriendCard(g.userId, level.level);
  if (!result.ok) return NextResponse.json({ error: "Friends are not set up yet.", code: "unavailable" }, { status: 503 });
  return NextResponse.json({ data: result.card }, { status: 201 });
}

/** Changes the name your friends see. */
export async function PUT(request: Request) {
  const g = await guard("friends-card", { write: true, limit: 10 });
  if (g.error) return g.error;

  const parsed = friendNameSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest();
  const name = validateDisplayName(parsed.data.name);
  if (!name.ok) return badRequest(name.message);

  const { card } = await getCard(g.userId);
  if (!card) return NextResponse.json({ error: "Get your friend code first.", code: "no_card" }, { status: 409 });
  await updateCard(g.userId, { name: name.name });
  return NextResponse.json({ data: { name: name.name } });
}

/** Leaves the friends feature: your code, your friendships and your boss damage are deleted. */
export async function DELETE() {
  const g = await guard("friends-card", { write: true, limit: 10 });
  if (g.error) return g.error;
  await deleteCard(g.userId);
  return NextResponse.json({ data: { left: true } });
}
