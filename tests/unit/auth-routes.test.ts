import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimits } from "@/lib/rate-limit";

const signInWithPassword = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signInWithPassword } }),
}));

import { POST } from "@/app/api/auth/login/route";

function req(body: unknown) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    resetRateLimits();
    signInWithPassword.mockReset();
  });

  it("rejects invalid input with 400", async () => {
    expect((await POST(req({ email: "nope", password: "x" }))).status).toBe(400);
  });

  it("returns 401 for bad credentials", async () => {
    signInWithPassword.mockResolvedValue({ error: new Error("bad") });
    const res = await POST(req({ email: "a@b.co", password: "password1" }));
    expect(res.status).toBe(401);
  });

  it("returns 200 on success", async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    expect((await POST(req({ email: "a@b.co", password: "password1" }))).status).toBe(200);
  });

  it("rate limits after 5 attempts", async () => {
    signInWithPassword.mockResolvedValue({ error: new Error("bad") });
    for (let i = 0; i < 5; i++) await POST(req({ email: "a@b.co", password: "password1" }));
    const res = await POST(req({ email: "a@b.co", password: "password1" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });
});
