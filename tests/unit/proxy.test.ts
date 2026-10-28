import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const updateSession = vi.fn();
vi.mock("@/lib/supabase/proxy", () => ({
  updateSession: (req: NextRequest) => updateSession(req),
}));

import { proxy } from "@/proxy";

function call(path: string, userId: string | null) {
  updateSession.mockResolvedValue({ response: NextResponse.next(), userId });
  return proxy(new NextRequest(`http://localhost:3000${path}`));
}

describe("proxy auth protection", () => {
  beforeEach(() => updateSession.mockReset());

  it.each(["/dashboard", "/workouts", "/body", "/membership", "/schedule", "/settings", "/dashboard/x"])(
    "redirects anonymous users from %s to /login",
    async (path) => {
      const res = await call(path, null);
      expect(res.status).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
    },
  );

  it("returns 401 JSON for anonymous API calls", async () => {
    const res = await call("/api/weights", null);
    expect(res.status).toBe(401);
  });

  it("leaves auth API routes public", async () => {
    const res = await call("/api/auth/login", null);
    expect(res.status).toBe(200);
  });

  it("lets signed in users through", async () => {
    expect((await call("/dashboard", "u1")).status).toBe(200);
    expect((await call("/api/weights", "u1")).status).toBe(200);
  });

  it("sends signed in users away from /login", async () => {
    const res = await call("/login", "u1");
    expect(new URL(res.headers.get("location")!).pathname).toBe("/dashboard");
  });

  it("keeps the landing page public", async () => {
    expect((await call("/", null)).status).toBe(200);
  });
});
