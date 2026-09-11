/**
 * Email validation shared by every public form (contact, newsletter), so the
 * two cannot drift apart on what they accept.
 */

export const MAX_EMAIL_LENGTH = 254;

// Deliberately permissive: this catches typos and obvious junk, it does not
// adjudicate RFC 5322. Real deliverability is proven by us mailing them.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Coerces anything to a trimmed string - request bodies are untrusted. */
export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function isValidEmail(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= MAX_EMAIL_LENGTH &&
    EMAIL_PATTERN.test(value)
  );
}
