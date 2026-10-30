import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_USER_ID } from "@/lib/demo";
import { dailyDamage, type GateInput } from "@/lib/gates";
import { resetStores } from "@/lib/repositories/memory/store";

vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");

vi.mock("@/lib/battle/engine", async (original) => {
  const real = await original<typeof import("@/lib/battle/engine")>();
  return { ...real, buildBattle: vi.fn(real.buildBattle) };
});

import { buildBattle } from "@/lib/battle/engine";
import { loadLevel } from "@/lib/level";

const input = (): GateInput => ({
  sessions: [{ id: "a", date: "2026-11-03" }],
  sets: [{ id: "s1", session_id: "a", exercise_id: "bench", reps: 10, weight_kg: 100, completed_at: "2026-11-03T09:00:00Z" }],
  exerciseMuscles: { bench: "chest" },
});

beforeEach(() => {
  resetStores();
  vi.mocked(buildBattle).mockClear();
});

describe("the damage of an input", () => {
  it("is worked out once and shared by everything that asks about the same input", () => {
    const one = input();
    const first = dailyDamage(one);
    expect(dailyDamage(one)).toBe(first);
    expect(first.get("2026-11-03")).toBeGreaterThan(0);
  });

  it("is worked out again for a different input, so nothing stale is ever served", () => {
    const a = input();
    const b = input();
    b.sets = [{ ...b.sets[0], weight_kg: 200 }];
    expect(dailyDamage(b)).not.toBe(dailyDamage(a));
    expect(dailyDamage(b).get("2026-11-03")!).toBeGreaterThan(dailyDamage(a).get("2026-11-03")!);
  });
});

describe("loadLevel", () => {
  it("does not build the fights for a page that only reads the level", async () => {
    const game = await loadLevel(DEMO_USER_ID);
    expect(game.level.level).toBeGreaterThan(0);
    expect(game.gate).toBeTruthy();
    expect(buildBattle).not.toHaveBeenCalled();
  });

  it("builds the gate fight the first time it is read, and only once", async () => {
    const game = await loadLevel(DEMO_USER_ID);
    const battle = game.battle;
    expect(battle).not.toBeNull();
    expect(game.battle).toBe(battle);
    expect(game.fight).toMatchObject({ monster: battle!.monster.name, hpLeft: game.gate.hpLeft, weekStart: game.gate.gate.weekStart });
    expect(buildBattle).toHaveBeenCalledTimes(1);
  });

  it("has a season fight exactly when there is a season", async () => {
    const game = await loadLevel(DEMO_USER_ID);
    expect(game.seasonBattle === null).toBe(game.season === null);
  });
});
