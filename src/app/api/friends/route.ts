import { NextResponse } from "next/server";
import { badRequest, guard } from "@/lib/api";
import { todayISO } from "@/lib/dates";
import { MAX_FRIENDS, normalizeFriendCode } from "@/lib/friends";
import { acceptLink, createLink, findByCode, getCard, listLinks } from "@/lib/repositories/friends";
import { addFriendSchema } from "@/lib/validation/friends";

/** Most requests you can have waiting at once, so the endpoint cannot be used to flood people. */
const MAX_PENDING_SENT = 20;

/**
 * Your card (the code others type to add you) and your friends and requests. Other players' user ids never leave the server:
 * a friend is known to the page only by the id of the friendship, a name and a level.
 */
export async function GET() {
  const g = await guard("friends-list", { write: false });
  if (g.error) return g.error;

  const { available, card } = await getCard(g.userId);
  const links = card ? await listLinks(g.userId) : [];
  return NextResponse.json({
    data: {
      available,
      card,
      friends: links.filter((l) => l.status === "accepted").map(({ id, name, level, acceptedOn }) => ({ id, name, level, acceptedOn })),
      incoming: links.filter((l) => l.status === "pending" && l.direction === "incoming").map(({ id, name, level }) => ({ id, name, level })),
      outgoing: links.filter((l) => l.status === "pending" && l.direction === "outgoing").map(({ id, name, level }) => ({ id, name, level })),
      max: MAX_FRIENDS,
    },
  });
}

/**
 * Sends a friend request with a friend code. If that player already asked you, it is accepted. Limited to 10 tries a minute, so
 * codes cannot be guessed.
 */
export async function POST(request: Request) {
  const g = await guard("friends-add", { write: true, limit: 10 });
  if (g.error) return g.error;

  const parsed = addFriendSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest();
  const code = normalizeFriendCode(parsed.data.code);
  if (!code) return badRequest("That is not a friend code. A code has 8 letters and numbers.");

  const { card } = await getCard(g.userId);
  if (!card) return NextResponse.json({ error: "Get your own friend code first.", code: "no_card" }, { status: 409 });

  const otherId = await findByCode(code);
  if (!otherId) return NextResponse.json({ error: "No player has that code.", code: "unknown_code" }, { status: 404 });
  if (otherId === g.userId) return badRequest("That is your own code.");

  const links = await listLinks(g.userId);
  const accepted = links.filter((l) => l.status === "accepted").length;
  const existing = links.find((l) => l.otherId === otherId);
  if (existing?.status === "accepted") return NextResponse.json({ error: "You are already friends.", code: "exists" }, { status: 409 });
  if (existing?.direction === "outgoing") return NextResponse.json({ error: "You already sent a request.", code: "exists" }, { status: 409 });

  if (accepted >= MAX_FRIENDS) {
    return NextResponse.json({ error: `You can have up to ${MAX_FRIENDS} friends.`, code: "friend_limit" }, { status: 409 });
  }

  // They already asked you: adding them back is saying yes.
  if (existing) {
    const result = await acceptLink(g.userId, existing.id, todayISO());
    if (result === "full") return NextResponse.json({ error: "One of you has all the friends the game allows.", code: "friend_limit" }, { status: 409 });
    return NextResponse.json({ data: { status: "accepted" } });
  }

  if (links.filter((l) => l.status === "pending" && l.direction === "outgoing").length >= MAX_PENDING_SENT) {
    return NextResponse.json({ error: "You have too many requests waiting.", code: "too_many" }, { status: 409 });
  }
  const created = await createLink(g.userId, otherId);
  if (!created.ok) {
    return created.reason === "exists"
      ? NextResponse.json({ error: "A request between you two already exists.", code: "exists" }, { status: 409 })
      : NextResponse.json({ error: "Friends are not set up yet.", code: "unavailable" }, { status: 503 });
  }
  return NextResponse.json({ data: { status: "requested" } }, { status: 201 });
}
