// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BattleStage } from "@/components/battle/battle-stage";
import { buildBattle } from "@/lib/battle/engine";
import { GATE_RANKS, type Gate } from "@/lib/gates";
import { NO_EQUIPMENT } from "@/lib/items";
import { RANKS } from "@/lib/ranks";
import { computeStats } from "@/lib/stats";

const gate: Gate = { weekStart: "2026-11-09", weekEnd: "2026-11-15", rank: GATE_RANKS[0], name: "Gate of Iron", boss: "Iron Golem", hp: 700 };
const sessions = [{ id: "a", date: "2026-11-09" }];
const sets = [
  { id: "s1", session_id: "a", exercise_id: "bench", reps: 5, weight_kg: 60, completed_at: "2026-11-09T09:00:00Z" },
  { id: "s2", session_id: "a", exercise_id: "bench", reps: 5, weight_kg: 80, completed_at: "2026-11-09T09:05:00Z" },
];
const stats = computeStats({ checkins: [], sessions: [], sets: [], questsCompleted: 0 });
const battle = buildBattle({ gate, gateInput: { sessions, sets }, names: { bench: "Bench Press" }, stats, today: "2026-11-15" })!;

function mockMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduce && query.includes("reduce"),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

const renderStage = () => render(<BattleStage battle={battle} rank={RANKS[3]} equipment={NO_EQUIPMENT} gateName="Gate of Iron, rank E" />);

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("BattleStage", () => {
  it("opens at the end with every turn in the log and nothing to play when the system asks for less motion", () => {
    mockMotion(true);
    renderStage();
    // Each line is in the log, and the latest is also in a live region for screen readers.
    expect(screen.getAllByText(/Bench Press, 5 reps deal 300 damage/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Bench Press, 5 reps deal 400 damage/).length).toBeGreaterThan(0);
    expect(screen.getByText(/fell on set 2/)).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Playback" })).toBeNull();
    expect(screen.getByRole("progressbar", { name: /Iron Golem, 0 percent left/ })).toBeTruthy();
  });

  it("starts from the first set with controls when motion is allowed, and the log fills as the fight plays", async () => {
    mockMotion(false);
    renderStage();
    expect(screen.getByText("Set 0 of 2")).toBeTruthy();
    expect(screen.getByText(/Nothing yet/)).toBeTruthy();
    expect(screen.getByRole("group", { name: "Playback" })).toBeTruthy();
    // The first turn needs about a second of play: a pause, the swing and the impact.
    // Every step schedules the next one after React has drawn it, so the time is spent in small slices.
    for (let i = 0; i < 6; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(400);
      });
    }
    expect(screen.getByText("Set 1 of 2")).toBeTruthy();
    expect(screen.getAllByText(/Bench Press, 5 reps deal 300 damage/).length).toBeGreaterThan(0);
  });

  it("skips to the end and says how it ended", async () => {
    mockMotion(false);
    renderStage();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Skip to the end" }));
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(screen.getByText("Set 2 of 2")).toBeTruthy();
    expect(screen.getByText(/The Iron Golem fell on set 2/)).toBeTruthy();
  });

  it("shows what the hero brings this week", () => {
    mockMotion(true);
    renderStage();
    expect(screen.getByText("What you bring this week")).toBeTruthy();
    expect(screen.getByText("Critical hits")).toBeTruthy();
  });
});
