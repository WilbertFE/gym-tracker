import { beforeEach, describe, expect, it, vi } from "vitest";
import { formatPrice } from "@/lib/currency";
import { resetRateLimits } from "@/lib/rate-limit";
import { resetStores } from "@/lib/repositories/memory/store";
import { displayChange, displayVolume, displayWeight, formatNumber, fromKg, toKg } from "@/lib/units";

vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");

import { GET, PUT } from "@/app/api/settings/route";

const put = (body: unknown) => new Request("http://localhost/api/settings", { method: "PUT", body: JSON.stringify(body) });

beforeEach(() => {
  resetStores();
  resetRateLimits();
});

describe("units", () => {
  it("leaves kilograms alone", () => {
    expect(fromKg(61.2, "kg")).toBe(61.2);
    expect(toKg(61.2, "kg")).toBe(61.2);
  });

  it("converts pounds both ways", () => {
    expect(fromKg(100, "lb")).toBeCloseTo(220.46, 2);
    expect(toKg(135, "lb")).toBe(61.23);
  });

  it("round trips a typed value back to what was typed", () => {
    for (const lb of [45, 95, 135, 225, 315, 12.5]) {
      expect(displayWeight(toKg(lb, "lb"), "lb")).toBe(formatNumber(lb));
    }
  });

  it("drops a trailing .0 and never shows negative zero", () => {
    expect(formatNumber(135)).toBe("135");
    expect(formatNumber(61.25)).toBe("61.3");
    expect(formatNumber(-0.04)).toBe("0");
  });

  it("formats volume and signed change", () => {
    expect(displayVolume(1000, "kg")).toBe("1,000");
    expect(displayVolume(1000, "lb")).toBe("2,205");
    expect(displayChange(-0.5, "kg")).toBe("-0.5");
    expect(displayChange(1, "kg")).toBe("+1");
    expect(displayChange(0, "kg")).toBe("0");
  });
});

describe("formatPrice", () => {
  it("shows rupiah without cents and dollars with them", () => {
    expect(formatPrice(350000, "IDR")).toContain("350.000");
    expect(formatPrice(350000, "IDR")).toContain("Rp");
    expect(formatPrice(25, "USD")).toBe("$25");
    expect(formatPrice(24.5, "USD")).toBe("$24.50");
  });
});

describe("/api/settings", () => {
  it("returns defaults before anything is saved", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).data).toMatchObject({ country: null, weight_unit: "kg", currency: "IDR" });
  });

  it("saves and returns what was saved", async () => {
    const res = await PUT(put({ country: "ID", weight_unit: "lb", currency: "USD" }));
    expect(res.status).toBe(200);
    expect((await (await GET()).json()).data).toMatchObject({ country: "ID", weight_unit: "lb", currency: "USD" });
  });

  it("accepts no country", async () => {
    const res = await PUT(put({ country: null, weight_unit: "kg", currency: "IDR" }));
    expect(res.status).toBe(200);
  });

  it.each([
    { country: "XX", weight_unit: "kg", currency: "IDR" },
    { country: "ID", weight_unit: "stone", currency: "IDR" },
    { country: "ID", weight_unit: "kg", currency: "EUR" },
    { weight_unit: "kg", currency: "IDR" },
    null,
  ])("rejects invalid input %j", async (body) => {
    expect((await PUT(put(body))).status).toBe(400);
  });
});
