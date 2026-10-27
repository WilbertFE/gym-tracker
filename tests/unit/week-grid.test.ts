import { describe, expect, it } from "vitest";
import {
  blockPlacement,
  minutesAtOffset,
  selectionRange,
  snap,
  toInputTime,
  visibleRange,
  WEEK_GRID,
} from "@/lib/week-grid";

const H = WEEK_GRID.hourHeight;

describe("snap", () => {
  it("rounds to the nearest 15 minutes", () => {
    expect(snap(7)).toBe(0);
    expect(snap(8)).toBe(15);
    expect(snap(547)).toBe(540);
    expect(snap(553)).toBe(555);
  });
});

describe("minutesAtOffset", () => {
  it("maps pixels to snapped minutes from the grid start", () => {
    expect(minutesAtOffset(0, 360)).toBe(360);
    expect(minutesAtOffset(H, 360)).toBe(420);
    expect(minutesAtOffset(H * 1.5, 360)).toBe(450);
  });

  it("stays inside the day", () => {
    expect(minutesAtOffset(-500, 360)).toBe(0);
    expect(minutesAtOffset(100000, 360)).toBe(1440);
  });
});

describe("selectionRange", () => {
  it("orders the two ends whichever way you drag", () => {
    expect(selectionRange(600, 540, true)).toEqual({ start: 540, end: 600 });
    expect(selectionRange(540, 600, true)).toEqual({ start: 540, end: 600 });
  });

  it("turns a tap into a one hour range", () => {
    expect(selectionRange(540, 540, false)).toEqual({ start: 540, end: 600 });
  });

  it("turns a drag shorter than a step into a one hour range", () => {
    expect(selectionRange(540, 545, true)).toEqual({ start: 540, end: 600 });
  });

  it("keeps a tap near midnight inside the day", () => {
    const r = selectionRange(1400, 1400, false);
    expect(r.end).toBe(1440);
    expect(r.end - r.start).toBe(60);
  });
});

describe("toInputTime", () => {
  it("formats minutes and caps the end of the day at 23:59", () => {
    expect(toInputTime(540)).toBe("09:00");
    expect(toInputTime(555)).toBe("09:15");
    expect(toInputTime(1440)).toBe("23:59");
  });
});

describe("visibleRange", () => {
  it("defaults to 06:00 to 22:00", () => {
    expect(visibleRange([])).toEqual({ start: 360, end: 1320 });
  });

  it("widens to hold early and late commitments", () => {
    const r = visibleRange([
      { start_time: "05:30", end_time: "07:00" },
      { start_time: "21:00", end_time: "23:15" },
    ]);
    expect(r).toEqual({ start: 300, end: 1440 });
  });
});

describe("blockPlacement", () => {
  it("places a block by its start and length", () => {
    expect(blockPlacement({ start_time: "08:00", end_time: "09:30" }, 360)).toEqual({
      top: H * 2,
      height: H * 1.5,
    });
  });
});
