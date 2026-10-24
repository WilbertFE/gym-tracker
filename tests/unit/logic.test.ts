import { describe, expect, it } from "vitest";
import { membershipStatus } from "@/lib/membership";
import { computeStreak } from "@/lib/streak";
import type { WeightLog } from "@/lib/types";
import { summarizeWeights } from "@/lib/weight";

describe("computeStreak", () => {
  it("is zero with no check-ins", () => {
    expect(computeStreak([], "2026-10-24")).toEqual({
      current: 0,
      longest: 0,
      checkedInToday: false,
    });
  });

  it("counts consecutive days ending today", () => {
    const r = computeStreak(["2026-10-22", "2026-10-23", "2026-10-24"], "2026-10-24");
    expect(r).toEqual({ current: 3, longest: 3, checkedInToday: true });
  });

  it("keeps the streak alive when only yesterday is logged", () => {
    expect(computeStreak(["2026-10-22", "2026-10-23"], "2026-10-24").current).toBe(2);
  });

  it("resets after a missed day but remembers the longest run", () => {
    const r = computeStreak(
      ["2026-10-10", "2026-10-11", "2026-10-12", "2026-10-23"],
      "2026-10-24",
    );
    expect(r.current).toBe(1);
    expect(r.longest).toBe(3);
  });

  it("is zero when the last check-in is two or more days old", () => {
    expect(computeStreak(["2026-10-21", "2026-10-22"], "2026-10-24").current).toBe(0);
  });

  it("ignores duplicates and input order", () => {
    const r = computeStreak(["2026-10-24", "2026-10-23", "2026-10-24"], "2026-10-24");
    expect(r.current).toBe(2);
  });
});

describe("membershipStatus", () => {
  it("is active well before the end date", () => {
    expect(membershipStatus("2026-11-24", "2026-10-24")).toEqual({
      daysLeft: 31,
      state: "active",
    });
  });

  it("warns within the warning window, inclusive", () => {
    expect(membershipStatus("2026-10-31", "2026-10-24").state).toBe("expiring");
    expect(membershipStatus("2026-11-01", "2026-10-24").state).toBe("active");
  });

  it("is expiring on the last day and expired after", () => {
    expect(membershipStatus("2026-10-24", "2026-10-24")).toEqual({
      daysLeft: 0,
      state: "expiring",
    });
    expect(membershipStatus("2026-10-23", "2026-10-24")).toEqual({
      daysLeft: -1,
      state: "expired",
    });
  });
});

const log = (date: string, weight_kg: number): WeightLog => ({
  id: date,
  user_id: "u",
  date,
  weight_kg,
  notes: null,
});

describe("summarizeWeights", () => {
  it("handles no data", () => {
    expect(summarizeWeights([])).toEqual({ latest: null, changeTotal: null, change7d: null });
  });

  it("has no changes with a single entry", () => {
    const s = summarizeWeights([log("2026-10-24", 70)]);
    expect(s.latest?.weight_kg).toBe(70);
    expect(s.changeTotal).toBeNull();
    expect(s.change7d).toBeNull();
  });

  it("computes total and 7 day change regardless of input order", () => {
    const s = summarizeWeights([
      log("2026-10-24", 71.2),
      log("2026-10-01", 72.5),
      log("2026-10-16", 71.9),
    ]);
    expect(s.changeTotal).toBe(-1.3);
    expect(s.change7d).toBe(-0.7);
  });

  it("leaves 7 day change empty when nothing is old enough", () => {
    const s = summarizeWeights([log("2026-10-20", 70), log("2026-10-24", 71)]);
    expect(s.change7d).toBeNull();
    expect(s.changeTotal).toBe(1);
  });
});
