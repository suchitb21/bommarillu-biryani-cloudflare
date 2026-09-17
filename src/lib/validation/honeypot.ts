/**
 * Anti-spam honeypot shared by the public forms.
 *
 * A hidden input that people never see or fill, but which naive bots happily
 * complete. When it comes back non-empty the request is almost certainly
 * automated, so callers should return a normal success response and simply not
 * store anything - telling a bot it failed only teaches it to adapt.
 */

/** Field name, deliberately plausible to a form-filling bot. */
export const HONEYPOT_FIELD = "company";

export function isHoneypotFilled(body: unknown): boolean {
  if (typeof body !== "object" || body === null) return false;
  const value = (body as Record<string, unknown>)[HONEYPOT_FIELD];
  return typeof value === "string" && value.trim().length > 0;
}
