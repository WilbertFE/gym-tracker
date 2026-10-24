import "server-only";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const MUTATIONS_PER_MINUTE = 30;

export type Guard =
  | { userId: string; error: null }
  | { userId: null; error: NextResponse };

/** Authenticates the caller and, for writes, applies a per-user rate limit. */
export async function guard(
  scope: string,
  opts: { write: boolean; limit?: number },
): Promise<Guard> {
  const auth = await requireUser();
  if (auth.error) return { userId: null, error: auth.error };

  if (opts.write) {
    const limit = rateLimit(
      `${scope}:${auth.user.id}`,
      opts.limit ?? MUTATIONS_PER_MINUTE,
      60_000,
    );
    if (!limit.ok) {
      return {
        userId: null,
        error: NextResponse.json(
          { error: "Too many requests. Slow down." },
          { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
        ),
      };
    }
  }
  return { userId: auth.user.id, error: null };
}

export const badRequest = (message = "Invalid input") =>
  NextResponse.json({ error: message }, { status: 400 });

export const notFound = () =>
  NextResponse.json({ error: "Not found" }, { status: 404 });
