import { describe, expect, it } from "vitest";
import { contentTypeForPath, detectImageType } from "@/lib/photo-file";
import {
  compareProgress,
  describeSpan,
  latestOnOrBefore,
} from "@/lib/progress";
import type { WeightLog } from "@/lib/types";

const bytes = (...n: number[]) => new Uint8Array(n);
const ascii = (s: string) => new TextEncoder().encode(s);

describe("detectImageType", () => {
  it("recognises JPEG, PNG and WebP by their first bytes", () => {
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10))).toBe("image/jpeg");
    expect(detectImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe("image/png");
    const webp = new Uint8Array(16);
    webp.set(ascii("RIFF"), 0);
    webp.set(ascii("WEBP"), 8);
    expect(detectImageType(webp)).toBe("image/webp");
  });

  it("rejects everything else, including renamed scripts and SVG", () => {
    expect(detectImageType(ascii("<html><script>alert(1)</script></html>"))).toBeNull();
    expect(detectImageType(ascii('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
    expect(detectImageType(ascii("GIF89a"))).toBeNull();
    expect(detectImageType(new Uint8Array(0))).toBeNull();
    expect(detectImageType(bytes(0xff, 0xd8))).toBeNull();
  });

  it("does not accept a RIFF file that is not WebP", () => {
    const wav = new Uint8Array(16);
    wav.set(ascii("RIFF"), 0);
    wav.set(ascii("WAVE"), 8);
    expect(detectImageType(wav)).toBeNull();
  });
});

describe("contentTypeForPath", () => {
  it("maps known extensions and defaults to a download type", () => {
    expect(contentTypeForPath("u/a.jpg")).toBe("image/jpeg");
    expect(contentTypeForPath("u/a.PNG")).toBe("image/png");
    expect(contentTypeForPath("u/a.webp")).toBe("image/webp");
    expect(contentTypeForPath("u/a.svg")).toBe("image/svg+xml");
    expect(contentTypeForPath("u/a.html")).toBe("application/octet-stream");
    expect(contentTypeForPath("noext")).toBe("application/octet-stream");
  });
});

const weight = (date: string, weight_kg: number): WeightLog => ({
  id: date,
  user_id: "u",
  date,
  weight_kg,
  notes: null,
});

describe("latestOnOrBefore", () => {
  const rows = [{ date: "2026-10-10" }, { date: "2026-10-01" }, { date: "2026-10-20" }];

  it("finds the newest row on or before a date regardless of order", () => {
    expect(latestOnOrBefore(rows, "2026-10-15")?.date).toBe("2026-10-10");
    expect(latestOnOrBefore(rows, "2026-10-10")?.date).toBe("2026-10-10");
    expect(latestOnOrBefore(rows, "2026-12-01")?.date).toBe("2026-10-20");
  });

  it("returns null when nothing is that old", () => {
    expect(latestOnOrBefore(rows, "2026-09-30")).toBeNull();
    expect(latestOnOrBefore([], "2026-10-01")).toBeNull();
  });
});

describe("compareProgress", () => {
  const weights = [weight("2026-08-01", 72.4), weight("2026-09-12", 71.1), weight("2026-10-17", 69.9)];

  it("uses the nearest values on or before each photo date", () => {
    const c = compareProgress({
      beforeDate: "2026-08-03",
      afterDate: "2026-10-20",
      weights,
    });
    expect(c.daysApart).toBe(78);
    expect(c.weight).toEqual({ before: 72.4, after: 69.9, change: -2.5 });
  });

  it("skips weight when a date has no earlier entry", () => {
    const c = compareProgress({ beforeDate: "2026-07-01", afterDate: "2026-10-20", weights });
    expect(c.weight).toBeNull();
  });

  it("reports a negative span if the dates are swapped", () => {
    const c = compareProgress({ beforeDate: "2026-10-20", afterDate: "2026-10-10", weights });
    expect(c.daysApart).toBe(-10);
  });

  it("omits weight when both dates resolve to the same entry", () => {
    const c = compareProgress({
      beforeDate: "2026-08-05",
      afterDate: "2026-09-01",
      weights,
    });
    expect(c.weight).toBeNull();
  });
});

describe("describeSpan", () => {
  it("uses days for short spans and weeks for long ones", () => {
    expect(describeSpan(1)).toBe("1 day");
    expect(describeSpan(5)).toBe("5 days");
    expect(describeSpan(13)).toBe("13 days");
    expect(describeSpan(14)).toBe("2 weeks");
    expect(describeSpan(-84)).toBe("12 weeks");
  });
});
