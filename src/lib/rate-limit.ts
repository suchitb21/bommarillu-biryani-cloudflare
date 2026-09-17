/**
 * Best-effort in-memory rate limiting, shared by the admin login and the two
 * public forms.
 *
 * This is a per-server-instance Map, so on serverless it resets on cold start
 * and is not shared across concurrent instances. It raises the cost of casual
 * abuse; it is not a hard guarantee. Anything that needs a real guarantee needs
 * shared storage (Upstash/Redis, or Vercel's own rate limiting).
 */

const buckets = new Map<string, number[]>();

/** Timestamps still inside the window; also prunes so the map cannot grow. */
function recentAttempts(key: string, windowMs: number, now: number): number[] {
  const kept = (buckets.get(key) ?? []).filter((at) => now - at < windowMs);
  buckets.set(key, kept);
  return kept;
}

/**
 * True when `key` has already reached `limit` inside `windowMs`. Does not
 * record anything - callers decide what counts as an attempt.
 */
export function isRateLimited(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  return recentAttempts(key, windowMs, Date.now()).length >= limit;
}

/** Records one attempt against `key`. */
export function recordAttempt(key: string, windowMs: number): void {
  const now = Date.now();
  buckets.set(key, [...recentAttempts(key, windowMs, now), now]);
}

export function clearAttempts(key: string): void {
  buckets.delete(key);
}

/**
 * Client identity for rate limiting. Vercel sets `x-forwarded-for`; without a
 * usable value every caller shares one bucket, which errs toward over-limiting
 * rather than letting requests through unthrottled.
 */
export function clientKeyFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}
