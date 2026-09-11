/**
 * Admin configuration, read from the environment.
 *
 * Deliberately free of `server-only` so `src/proxy.ts` can import it too.
 * Nothing here is secret *values* - just lookups that fail loudly when a
 * deployment is missing a variable, instead of silently 500ing later.
 */

/** 30 days, as requested. Matches the cookie's maxAge. */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

const isProduction = process.env.NODE_ENV === "production";

/**
 * In production the `__Host-` prefix is used, which browsers only honour when
 * the cookie is Secure, has Path=/, and has no Domain - a strong anti-fixation
 * guarantee. It cannot be set over plain http, so local dev uses a bare name.
 */
export const SESSION_COOKIE_NAME = isProduction ? "__Host-bb_admin" : "bb_admin";

/** Days of Square order history the dashboard scans back over. */
const DEFAULT_ORDER_LOOKBACK_DAYS = 90;
const MAX_ORDER_LOOKBACK_DAYS = 365;

export function getAdminPasswordHash(): string {
  const value = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (!value) {
    throw new Error(
      "ADMIN_PASSWORD_HASH is not set. Generate one with: node scripts/hash-admin-password.mjs 'your-password'"
    );
  }
  return value;
}

export function getSessionSecret(): string {
  const value = process.env.SESSION_SECRET?.trim();
  if (!value || value.length < 32) {
    throw new Error(
      "SESSION_SECRET is missing or shorter than 32 characters. Generate one with: openssl rand -base64 48"
    );
  }
  return value;
}

export function getOrderLookbackDays(): number {
  const raw = process.env.ADMIN_ORDER_LOOKBACK_DAYS?.trim();
  if (!raw) return DEFAULT_ORDER_LOOKBACK_DAYS;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_ORDER_LOOKBACK_DAYS;

  return Math.min(parsed, MAX_ORDER_LOOKBACK_DAYS);
}

export function isProductionEnvironment(): boolean {
  return isProduction;
}
