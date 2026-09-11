/**
 * Best-effort login throttle.
 *
 * This is an in-memory Map, so it is per-server-instance: on serverless it
 * resets on cold start and is not shared across concurrent instances. It
 * raises the cost of casual brute-forcing but is NOT a hard guarantee. A
 * shared password with no lockout is the weakest link in this auth design,
 * so treat a durable limiter (or per-user accounts) as the eventual upgrade.
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const attempts = new Map<string, number[]>();

function recentAttempts(key: string, now: number): number[] {
  return (attempts.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
}

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = recentAttempts(key, now);
  attempts.set(key, recent);
  return recent.length >= MAX_ATTEMPTS;
}

export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  attempts.set(key, [...recentAttempts(key, now), now]);
}

export function clearAttempts(key: string): void {
  attempts.delete(key);
}
