import { beforeEach, describe, expect, it } from "vitest";
import { rateLimit, resetRateLimits } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => resetRateLimits());

  it("allows requests up to the limit then blocks", () => {
    for (let i = 0; i < 3; i++) {
      expect(rateLimit("k", 3, 1000, 0).ok).toBe(true);
    }
    const blocked = rateLimit("k", 3, 1000, 0);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(1);
  });

  it("resets after the window", () => {
    rateLimit("k", 1, 1000, 0);
    expect(rateLimit("k", 1, 1000, 500).ok).toBe(false);
    expect(rateLimit("k", 1, 1000, 1001).ok).toBe(true);
  });

  it("tracks keys independently", () => {
    rateLimit("a", 1, 1000, 0);
    expect(rateLimit("b", 1, 1000, 0).ok).toBe(true);
  });
});
