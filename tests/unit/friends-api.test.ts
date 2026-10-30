import { beforeEach, describe, expect, it, vi } from "vitest";
import { todayISO } from "@/lib/dates";
import { DEMO_USER_ID } from "@/lib/demo";
import { friendBossFor } from "@/lib/friends";
import { loadLevel } from "@/lib/level";
import { resetRateLimits } from "@/lib/rate-limit";
import { resetStores } from "@/lib/repositories/memory/store";

vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");

import { DELETE as removeFriend, PUT as answerFriend } from "@/app/api/friends/[id]/route";
import { DELETE as leave, POST as getCard, PUT as rename } from "@/app/api/friends/card/route";
import { GET as list, POST as add } from "@/app/api/friends/route";
import { POST as sync } from "@/app/api/leaderboard/sync/route";
import { weekRange } from "@/lib/week";

const json = (body: unknown) => ({ method: "POST", body: JSON.stringify(body) });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) }) as never;
const addCode = (code: unknown) => add(new Request("http://localhost/api/friends", json({ code })));
const overview = async () => (await (await list()).json()).data;
const makeCard = async () => (await (await getCard()).json()).data as { code: string; name: string; level: number };

beforeEach(() => {
  resetStores();
  resetRateLimits();
});

describe("GET /api/friends", () => {
  it("has no card until you ask for one, and then no user ids anywhere", async () => {
    const before = await overview();
    expect(before.available).toBe(true);
    expect(before.card).toBeNull();
    expect(before.friends).toEqual([]);

    await makeCard();
    const after = await overview();
    expect(after.card.code).toMatch(/^[A-Z2-9]{8}$/);
    expect(after.friends).toHaveLength(4);
    for (const friend of after.friends) expect(Object.keys(friend).sort()).toEqual(["acceptedOn", "id", "level", "name"]);
    expect(JSON.stringify(after)).not.toContain("sample-f");
    expect(after.max).toBe(10);
  });
});

describe("POST /api/friends/card", () => {
  it("makes a code and a neutral name, and asking again returns the same card", async () => {
    const first = await makeCard();
    expect(first.name).toMatch(/^Lifter [A-Z2-9]{4}$/);
    expect(first.level).toBeGreaterThanOrEqual(1);
    expect(await makeCard()).toEqual(first);
  });

  it("limits how often it can be asked", async () => {
    let status = 0;
    for (let i = 0; i < 12; i++) status = (await getCard()).status;
    expect(status).toBe(429);
  });
});

describe("PUT /api/friends/card", () => {
  const put = (name: unknown) => rename(new Request("http://localhost/api/friends/card", { method: "PUT", body: JSON.stringify({ name }) }));

  it("changes the name friends see, with the same rules as a nickname", async () => {
    await makeCard();
    expect((await put("Iron Mike")).status).toBe(200);
    expect((await overview()).card.name).toBe("Iron Mike");
    expect((await put("ab")).status).toBe(400);
    expect((await put("<script>alert(1)</script>")).status).toBe(400);
    expect((await overview()).card.name).toBe("Iron Mike");
  });

  it("needs a card first", async () => {
    expect((await put("Iron Mike")).status).toBe(409);
  });
});

describe("POST /api/friends", () => {
  it("needs your own card first", async () => {
    const res = await addCode("ABCDEFGH");
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("no_card");
  });

  it("refuses what is not a code, an unknown code and your own code", async () => {
    const mine = await makeCard();
    expect((await addCode("nope")).status).toBe(400);
    expect((await addCode(12345678)).status).toBe(400);
    const unknown = await addCode("ABCDEFGH");
    expect(unknown.status).toBe(404);
    expect((await unknown.json()).code).toBe("unknown_code");
    expect((await addCode(mine.code)).status).toBe(400);
  });

  it("refuses someone who is already a friend", async () => {
    await makeCard();
    const res = await addCode("SAMP2LEX");
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("exists");
  });

  it("sends a request to someone who is not, once, and lists it as waiting", async () => {
    await makeCard();
    const [friend] = (await overview()).friends;
    expect((await removeFriend(new Request("http://localhost/api/friends/x", { method: "DELETE" }), ctx(friend.id))).status).toBe(200);

    const sent = await addCode("samp2-lex");
    expect(sent.status).toBe(201);
    expect((await sent.json()).data.status).toBe("requested");
    const after = await overview();
    expect(after.outgoing).toHaveLength(1);
    expect(after.friends).toHaveLength(3);
    // A second time is refused.
    expect((await addCode("SAMP2LEX")).status).toBe(409);
  });

  it("limits how often codes can be tried", async () => {
    await makeCard();
    let status = 0;
    for (let i = 0; i < 12; i++) status = (await addCode("ABCDEFGH")).status;
    expect(status).toBe(429);
  });
});

describe("PUT and DELETE /api/friends/[id]", () => {
  const answer = (id: string, body: unknown = { action: "accept" }) =>
    answerFriend(new Request(`http://localhost/api/friends/${id}`, { method: "PUT", body: JSON.stringify(body) }), ctx(id));
  const remove = (id: string) => removeFriend(new Request(`http://localhost/api/friends/${id}`, { method: "DELETE" }), ctx(id));

  it("removes a friend, and a second time is not found", async () => {
    await makeCard();
    const [friend] = (await overview()).friends;
    expect((await remove(friend.id)).status).toBe(200);
    expect((await overview()).friends).toHaveLength(3);
    expect((await remove(friend.id)).status).toBe(404);
  });

  it("cannot accept a request you sent yourself, a friendship that already stands or something that does not exist", async () => {
    await makeCard();
    const [friend] = (await overview()).friends;
    await remove(friend.id);
    await addCode("SAMP2LEX");
    const [waiting] = (await overview()).outgoing;
    expect((await answer(waiting.id)).status).toBe(404);
    const [stands] = (await overview()).friends;
    expect((await answer(stands.id)).status).toBe(404);
    expect((await answer("not-a-real-id")).status).toBe(404);
    expect((await answer(stands.id, { action: "promote" })).status).toBe(400);
  });

  it("cannot touch someone else's friendship", async () => {
    await makeCard();
    expect((await remove("00000000-0000-0000-0000-000000000000")).status).toBe(404);
  });
});

describe("DELETE /api/friends/card", () => {
  it("deletes the code, the friendships and the damage", async () => {
    await makeCard();
    expect((await leave()).status).toBe(200);
    const after = await overview();
    expect(after.card).toBeNull();
    expect(after.friends).toEqual([]);
  });
});

describe("the friends boss in the game state", () => {
  it("has no group until you have a card, then you and your four friends with a boss for this week", async () => {
    expect((await loadLevel(DEMO_USER_ID)).friends).toMatchObject({ available: true, card: null, members: [] });

    await makeCard();
    const { friends } = await loadLevel(DEMO_USER_ID);
    expect(friends.members).toHaveLength(5);
    expect(friends.members.filter((m) => m.isMe)).toHaveLength(1);
    const today = todayISO();
    const boss = friendBossFor(friends.members, weekRange(today).start, today)!;
    expect(boss.members).toHaveLength(5);
    expect(boss.hp).toBeGreaterThan(0);
  });

  it("is brought up to date by the sync, which does nothing for a player without a card", async () => {
    expect((await sync()).status).toBe(204);
    await makeCard();
    resetRateLimits();
    expect((await sync()).status).toBe(204);
  });
});
