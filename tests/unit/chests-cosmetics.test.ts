import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildShareCard } from "@/lib/share";
import { CHEST_TEMPLATES, drawShareCard, SHARE_FORMATS, SHARE_TEMPLATES, templatesFor } from "@/lib/share-render";
import { BUILT_IN_EXERCISES } from "@/lib/exercise-library";
import { DEMO_USER_ID } from "@/lib/demo";
import { itemById, LOOK_COLORS } from "@/lib/items";
import { resetRateLimits } from "@/lib/rate-limit";
import { getStore, resetStores } from "@/lib/repositories/memory/store";
import { workoutBody } from "@/lib/workout-body";

vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");
vi.stubGlobal("Path2D", class {});

import { GET as getBoard } from "@/app/api/leaderboard/route";
import { PUT as join } from "@/app/api/leaderboard/profile/route";

const ctxStub = () => {
  const drawn: string[] = [];
  const target: Record<string, unknown> = {
    measureText: (s: string) => ({ width: s.length * 10 }),
    fillText: (s: string) => void drawn.push(s),
    createLinearGradient: () => ({ addColorStop: () => {} }),
  };
  const ctx = new Proxy(target, {
    get: (t, key: string) => (key in t ? t[key] : () => {}),
    set: (t, key: string, value) => ((t[key] = value), true),
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, drawn };
};

describe("the share looks from chests", () => {
  it("show in the picker only once they are owned", () => {
    const free = SHARE_TEMPLATES.map((t) => t.value);
    expect(templatesFor([]).map((t) => t.value)).toEqual(free);
    expect(templatesFor(["ember"]).map((t) => t.value)).toEqual([...free, "ember"]);
    expect(templatesFor(["aurora", "ember", "nope"]).map((t) => t.value)).toEqual([...free, "ember", "aurora"]);
  });

  it("match the colors of their items", () => {
    expect(CHEST_TEMPLATES.map((t) => t.value).sort()).toEqual(Object.keys(LOOK_COLORS).sort());
    for (const look of CHEST_TEMPLATES) expect(itemById(`look-${look.value}`)?.value).toBe(look.value);
  });

  it.each(CHEST_TEMPLATES.flatMap((t) => SHARE_FORMATS.map((f) => [t.value, f.value] as const)))(
    "draw the %s look in the %s size with the same facts as every other look",
    (template, format) => {
      const session = { id: "s", user_id: "u", date: "2026-11-02", duration_minutes: 65, started_at: "", ended_at: "" } as never;
      const sets: never[] = [];
      const card = buildShareCard({
        session,
        sets,
        exercises: BUILT_IN_EXERCISES,
        unit: "kg",
        body: workoutBody({ allSessions: [session], allSets: sets, session, sets, exercises: BUILT_IN_EXERCISES }),
      });
      const { ctx, drawn } = ctxStub();
      expect(() => drawShareCard(ctx, card, template, format, { sans: "sans-serif", mono: "monospace" })).not.toThrow();
      expect(drawn).toEqual(expect.arrayContaining(["MUSCLES LEVELING", card.title, card.volume]));
    },
  );
});

describe("the nameplate on the leaderboard", () => {
  beforeEach(() => {
    resetStores();
    resetRateLimits();
  });

  const joinAs = (name: string) =>
    join(new Request("http://localhost/api/leaderboard/profile", { method: "PUT", body: JSON.stringify({ display_name: name }) }));
  const me = async () => (await (await getBoard(new Request("http://localhost/api/leaderboard"))).json()).data.me;

  it("shows the word of the worn nameplate next to the nickname", async () => {
    const store = getStore(DEMO_USER_ID);
    store.chestOpenings.push({ chest_id: "d:2026-10-29", item_id: "plate-grinder", grade: "rare", duplicate: false, bonus_xp: 0, opened_at: "2026-10-30T00:00:00.000Z", opened_on: "2026-10-30" });
    store.equipment.plate = "plate-grinder";
    expect((await joinAs("Plated Lifter")).status).toBe(200);
    expect((await me()).plate).toBe("Grinder");
  });

  it("shows none when no plate is worn", async () => {
    expect((await joinAs("Plain Lifter")).status).toBe(200);
    expect((await me()).plate).toBeNull();
  });

  it("shows none for a plate that is not owned, even if the store says it is worn", async () => {
    getStore(DEMO_USER_ID).equipment.plate = "plate-ascendant";
    expect((await joinAs("Sneaky Lifter")).status).toBe(200);
    expect((await me()).plate).toBeNull();
  });

  it("never shows the item, only the word", async () => {
    const store = getStore(DEMO_USER_ID);
    store.chestOpenings.push({ chest_id: "d:2026-10-29", item_id: "plate-night", grade: "common", duplicate: false, bonus_xp: 0, opened_at: "2026-10-30T00:00:00.000Z", opened_on: "2026-10-30" });
    store.equipment.plate = "plate-night";
    await joinAs("Word Only");
    expect(JSON.stringify(await me())).not.toContain("plate-night");
  });
});
