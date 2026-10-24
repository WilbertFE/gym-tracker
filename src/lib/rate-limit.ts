type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * Fixed window in-memory limiter. Good enough for a single user app on one
 * instance; swap for a shared store (for example Upstash) if scaled out.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): RateLimitResult {
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
  return {
    ok: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSeconds,
  };
}

export function clientKey(request: Request, scope: string) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `${scope}:${ip ?? "unknown"}`;
}

/** Test helper. */
export function resetRateLimits() {
  buckets.clear();
}
