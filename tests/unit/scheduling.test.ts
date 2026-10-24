import { describe, expect, it } from "vitest";
import {
  suggestSlots,
  toMinutes,
  toTime,
  typicalDurationMinutes,
  WEEKDAY_NAMES,
  WEEKDAY_ORDER,
} from "@/lib/scheduling";
import type { AvailabilityBlock, WorkoutSession } from "@/lib/types";

// Saturday 24 October 2026, 10:00 local time. Local Dates keep tests timezone safe.
const NOW = new Date(2026, 9, 24, 10, 0);

const pad = (n: number) => String(n).padStart(2, "0");

/** A finished workout at the given local day and hour. `month` is 1 based. */
function workout(month: number, day: number, hour: number, minutes: number | null = 60): WorkoutSession {
  const start = new Date(2026, month - 1, day, hour, 0);
  return {
    id: `w-${month}-${day}-${hour}`,
    user_id: "u",
    date: `2026-${pad(month)}-${pad(day)}`,
    started_at: start.toISOString(),
    ended_at: minutes === null ? null : new Date(start.getTime() + minutes * 60_000).toISOString(),
    duration_minutes: minutes,
    notes: null,
  };
}

let n = 0;
const block = (weekday: number, start: string, end: string): AvailabilityBlock => ({
  id: `b${n++}`,
  user_id: "u",
  weekday,
  start_time: start,
  end_time: end,
  label: null,
});

describe("time helpers", () => {
  it("converts between HH:MM and minutes", () => {
    expect(toMinutes("00:00")).toBe(0);
    expect(toMinutes("18:30")).toBe(1110);
    expect(toTime(1110)).toBe("18:30");
    expect(toTime(toMinutes("06:05"))).toBe("06:05");
  });

  it("lists Monday first and covers all seven weekdays once", () => {
    expect(WEEKDAY_ORDER[0]).toBe(1);
    expect(WEEKDAY_ORDER[6]).toBe(0);
    expect([...WEEKDAY_ORDER].sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(WEEKDAY_NAMES[new Date(2026, 9, 24).getDay()]).toBe("Saturday");
  });
});

describe("typicalDurationMinutes", () => {
  it("defaults to an hour with no finished workouts", () => {
    expect(typicalDurationMinutes([])).toBe(60);
    expect(typicalDurationMinutes([workout(10, 1, 18, null)])).toBe(60);
  });

  it("uses the median rounded up to 15 minutes", () => {
    const sessions = [62, 55, 70].map((m, i) => workout(10, i + 1, 18, m));
    expect(typicalDurationMinutes(sessions)).toBe(75);
    const even = [40, 50].map((m, i) => workout(10, i + 1, 18, m));
    expect(typicalDurationMinutes(even)).toBe(45);
  });

  it("clamps to 30 to 120 minutes", () => {
    expect(typicalDurationMinutes([workout(10, 1, 18, 10)])).toBe(30);
    expect(typicalDurationMinutes([workout(10, 1, 18, 300)])).toBe(120);
  });
});

describe("suggestSlots", () => {
  it("picks the earliest free slot per day when there is no history", () => {
    const result = suggestSlots({ blocks: [], sessions: [], now: NOW, limit: 7 });
    expect(result).toHaveLength(7);
    // Today starts at the next half hour after now plus the 15 minute lead.
    expect(result[0]).toMatchObject({ date: "2026-10-24", start: "10:30", end: "11:30" });
    expect(result[1]).toMatchObject({ date: "2026-10-25", start: "06:00", end: "07:00" });
    expect(result[0].reasons).toContain("No commitments logged");
  });

  it("returns the requested number of days, best first", () => {
    const three = suggestSlots({ blocks: [], sessions: [], now: NOW });
    expect(three).toHaveLength(3);
    const scores = three.map((s) => s.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it("never suggests a slot inside the day window or before now", () => {
    const late = new Date(2026, 9, 24, 21, 45);
    const result = suggestSlots({ blocks: [], sessions: [], now: late, limit: 7 });
    expect(result.find((s) => s.date === "2026-10-24")).toBeUndefined();
    for (const s of result) {
      expect(toMinutes(s.start)).toBeGreaterThanOrEqual(6 * 60);
      expect(toMinutes(s.end)).toBeLessThanOrEqual(22 * 60);
    }
  });

  it("skips a day that is fully booked", () => {
    const monday = 1;
    const result = suggestSlots({
      blocks: [block(monday, "06:00", "22:00")],
      sessions: [],
      now: NOW,
      limit: 7,
    });
    expect(result.find((s) => s.weekday === monday)).toBeUndefined();
    expect(result).toHaveLength(6);
  });

  it("keeps a 30 minute travel buffer after a commitment", () => {
    const tuesday = 2;
    const result = suggestSlots({
      blocks: [block(tuesday, "06:00", "17:00")],
      sessions: [],
      now: NOW,
      limit: 7,
    });
    const slot = result.find((s) => s.weekday === tuesday)!;
    expect(slot.start).toBe("17:30");
    expect(slot.reasons).toContain("Free around your commitments");
  });

  it("fits a slot between two commitments only if the buffers allow it", () => {
    const wednesday = 3;
    // 08:00 to 12:00 and 13:30 to 22:00 leaves 12:00 to 13:30. Buffers eat 30 minutes each side,
    // so no hour long slot fits and the early morning slot before the class is used instead.
    const result = suggestSlots({
      blocks: [block(wednesday, "08:00", "12:00"), block(wednesday, "13:30", "22:00")],
      sessions: [],
      now: NOW,
      limit: 7,
    });
    const slot = result.find((s) => s.weekday === wednesday)!;
    expect(slot.start).toBe("06:00");
    expect(slot.end).toBe("07:00");
  });

  it("prefers the weekday and time of day you usually train", () => {
    const sessions = [workout(10, 20, 18), workout(10, 22, 18), workout(10, 17, 18)]; // Tue, Thu, Sat
    const result = suggestSlots({ blocks: [], sessions, now: NOW, limit: 3 });
    expect(result.map((s) => s.start)).toEqual(["18:00", "18:00", "18:00"]);
    expect(result.map((s) => s.weekday).sort()).toEqual([2, 4, 6]);
    const tuesday = result.find((s) => s.weekday === 2)!;
    expect(tuesday.reasons).toContain("You usually train on Tuesdays around 18:00");
  });

  it("falls back to your usual hour on days you have not trained before", () => {
    const sessions = [workout(10, 20, 18), workout(10, 22, 18)];
    const result = suggestSlots({ blocks: [], sessions, now: NOW, limit: 7 });
    const sunday = result.find((s) => s.weekday === 0)!;
    expect(sunday.start).toBe("18:00");
    expect(sunday.reasons).toContain("You often train around 18:00");
  });

  it("penalises a day you already trained and the day after a workout", () => {
    const sessions = [workout(10, 24, 9)]; // earlier today
    const result = suggestSlots({ blocks: [], sessions, now: NOW, limit: 7 });
    const today = result.find((s) => s.date === "2026-10-24")!;
    expect(today.reasons).toContain("You already trained that day");
    const tomorrow = result.find((s) => s.date === "2026-10-25")!;
    expect(tomorrow.reasons).toContain("You trained the day before");
    const later = result.find((s) => s.date === "2026-10-27")!;
    expect(later.reasons).toContain("Well rested");
    expect(later.score).toBeGreaterThan(today.score);
    expect(later.score).toBeGreaterThan(tomorrow.score);
  });

  it("penalises days after the weekly target is reached", () => {
    const sessions = [19, 20, 21, 22].map((d) => workout(10, d, 18)); // Mon to Thu
    const result = suggestSlots({ blocks: [], sessions, now: NOW, limit: 7 });
    const saturday = result.find((s) => s.date === "2026-10-24")!;
    expect(saturday.reasons).toContain("Already 4 workouts that week");
    // The next week starts fresh.
    const nextWeek = result.find((s) => s.date === "2026-10-27")!;
    expect(nextWeek.reasons.some((r) => r.startsWith("Already"))).toBe(false);
  });

  it("honours a custom duration", () => {
    const [first] = suggestSlots({ blocks: [], sessions: [], now: NOW, durationMinutes: 120 });
    expect(toMinutes(first.end) - toMinutes(first.start)).toBe(120);
  });

  it("uses the typical workout length when none is given", () => {
    const sessions = [workout(10, 20, 18, 62)];
    const [first] = suggestSlots({ blocks: [], sessions, now: NOW });
    expect(toMinutes(first.end) - toMinutes(first.start)).toBe(75);
  });

  it("ignores commitments on other weekdays", () => {
    const saturday = 6;
    const result = suggestSlots({
      blocks: [block(saturday, "06:00", "22:00")],
      sessions: [],
      now: NOW,
      limit: 7,
    });
    expect(result.find((s) => s.weekday === saturday)).toBeUndefined();
    expect(result.find((s) => s.weekday === 0)).toBeDefined();
  });
});
