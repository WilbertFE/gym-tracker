import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeXp } from "@/lib/xp";
import { DEMO_USER_ID } from "@/lib/demo";
import { ITEMS, itemsOfGrade } from "@/lib/items";
import { resetRateLimits } from "@/lib/rate-limit";
import { getStore, resetStores } from "@/lib/repositories/memory/store";

vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");

import { GET as getChests } from "@/app/api/chests/route";
import { POST as openChest } from "@/app/api/chests/open/route";
import { GET as getEquipment, PUT as putEquipment } from "@/app/api/equipment/route";

const post = (body: unknown) =>
  openChest(new Request("http://localhost/api/chests/open", { method: "POST", body: JSON.stringify(body) }));
const put = (body: unknown) =>
  putEquipment(new Request("http://localhost/api/equipment", { method: "PUT", body: JSON.stringify(body) }));
const state = async () => (await (await getChests()).json()).data;

beforeEach(() => {
  resetStores();
  resetRateLimits();
});

describe("GET /api/chests", () => {
  it("lists the chests waiting, daily, weekly and gate, with the days left", async () => {
    const data = await state();
    expect(data.enabled).toBe(true);
    expect(data.available.map((c: { kind: string }) => c.kind).sort()).toEqual(["daily", "daily", "daily", "daily", "daily", "gate", "weekly", "weekly"]);
    for (const chest of data.available) {
      expect(chest.daysLeft).toBeGreaterThanOrEqual(0);
      expect(chest.id).toMatch(/^[dwg]:\d{4}-\d{2}-\d{2}$/);
    }
    expect(data.openings).toEqual([]);
    expect(data.collection.owned).toEqual([]);
  });
});

describe("POST /api/chests/open", () => {
  it("opens a chest, stores what was in it and counts one fewer waiting", async () => {
    const [first] = (await state()).available;
    const res = await post({ chestId: first.id });
    expect(res.status).toBe(201);
    const { data } = await res.json();
    expect(data.chestId).toBe(first.id);
    expect(ITEMS.map((i) => i.id)).toContain(data.item.id);
    expect(data.item.grade).toBe(data.grade);
    expect(data.duplicate).toBe(false);
    expect(data.remaining).toBe(7);

    const after = await state();
    expect(after.available).toHaveLength(7);
    expect(after.openings).toHaveLength(1);
    expect(after.collection.owned).toEqual([data.item.id]);
  });

  it("will not open the same chest twice", async () => {
    const [first] = (await state()).available;
    expect((await post({ chestId: first.id })).status).toBe(201);
    const again = await post({ chestId: first.id });
    expect(again.status).toBe(409);
    expect((await again.json()).code).toBe("already_opened");
    expect((await state()).openings).toHaveLength(1);
  });

  it("refuses a chest that was never earned, and a badly formed id", async () => {
    expect((await post({ chestId: "d:2020-01-01" })).status).toBe(400);
    expect((await post({ chestId: "w:2099-01-05" })).status).toBe(400);
    for (const bad of ["x", "d:2026-1-1", "", null, 5]) expect((await post({ chestId: bad })).status, String(bad)).toBe(400);
    expect((await post({})).status).toBe(400);
  });

  it("refuses a chest that ran out", async () => {
    getStore(DEMO_USER_ID).demoChests.push({ id: "d:2026-01-01", kind: "daily", earnedOn: "2026-01-01", expiresOn: "2026-01-08" });
    const res = await post({ chestId: "d:2026-01-01" });
    expect(res.status).toBe(410);
    expect((await res.json()).code).toBe("expired");
    expect((await state()).expired).toBe(1);
  });

  it("limits how often it can be called", async () => {
    let last = 0;
    for (let i = 0; i < 11; i++) last = (await post({ chestId: "nope" })).status;
    expect(last).toBe(429);
  });

  it("opens every chest and a repeat only comes up when its whole grade is owned", async () => {
    const ids = (await state()).available.map((c: { id: string }) => c.id);
    const got: string[] = [];
    const owned = new Set<string>();
    for (const id of ids) {
      const res = await post({ chestId: id });
      expect(res.status).toBe(201);
      const { data } = await res.json();
      // A repeat can only come up once the whole grade is owned (a grade can run out, with only a few items).
      if (data.duplicate) expect(itemsOfGrade(data.grade).every((i) => owned.has(i.id))).toBe(true);
      else got.push(data.item.id);
      owned.add(data.item.id);
    }
    expect(new Set(got).size).toBe(got.length);
    expect(ids).toHaveLength(8);
    expect((await state()).available).toEqual([]);
  });
});

describe("PUT /api/equipment", () => {
  async function ownOne() {
    const [first] = (await state()).available;
    const { data } = await (await post({ chestId: first.id })).json();
    return data.item as { id: string; slot: string };
  }

  it("wears an owned item, shows it, and takes it off again", async () => {
    const item = await ownOne();
    const res = await put({ slot: item.slot, itemId: item.id });
    expect(res.status).toBe(200);
    expect((await (await getEquipment()).json()).data[item.slot]).toBe(item.id);
    expect((await state()).collection.equipment[item.slot]).toBe(item.id);

    expect((await put({ slot: item.slot, itemId: null })).status).toBe(200);
    expect((await (await getEquipment()).json()).data[item.slot]).toBeNull();
  });

  it("refuses an item that is not owned, that does not exist, or that fits another slot", async () => {
    const item = await ownOne();
    const other = ITEMS.find((i) => i.id !== item.id && i.slot === item.slot)!;
    expect((await put({ slot: other.slot, itemId: other.id })).status).toBe(400);
    expect((await put({ slot: "frame", itemId: "nope" })).status).toBe(400);
    const wrongSlot = ITEMS.find((i) => i.slot !== item.slot)!;
    expect((await put({ slot: item.slot, itemId: wrongSlot.id })).status).toBe(400);
    expect((await put({ slot: "cape", itemId: item.id })).status).toBe(400);
    expect((await put({ slot: item.slot })).status).toBe(400);
  });

  it("does not count an item as worn once it is not owned, even if the store says so", async () => {
    getStore(DEMO_USER_ID).equipment.frame = "frame-apex";
    expect((await state()).collection.equipment.frame).toBeNull();
  });
});

describe("the XP from a repeat", () => {
  const base = { checkins: [], weights: [], photos: [], sessions: [], sets: [], welcomeBoost: false };

  it("counts on the day the chest was opened, as its own line", () => {
    const xp = computeXp({ ...base, chestBonuses: [{ date: "2026-11-02", xp: 6 }, { date: "2026-11-03", xp: 3 }] });
    const line = xp.lines.find((l) => l.source === "chests")!;
    expect(line).toMatchObject({ count: 2, xp: 9, bonus: 0 });
    expect(xp.total).toBe(9);
    expect(xp.byDate["2026-11-02"]).toBe(6);
  });

  it("is not there when no chest paid a repeat", () => {
    expect(computeXp(base).lines.find((l) => l.source === "chests")).toMatchObject({ count: 0, xp: 0 });
  });

  it("is only possible with a whole grade owned (the roll's own rule)", () => {
    expect(itemsOfGrade("legendary")).toHaveLength(4);
  });
});
