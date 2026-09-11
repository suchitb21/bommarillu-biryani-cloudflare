import { isValidEmail } from "@/lib/validation/email";

export type ContactPayload = {
  name: string;
  email: string;
  phone: string | null;
  message: string;
};

export type ValidationResult =
  | { ok: true; data: ContactPayload }
  | { ok: false; error: string };

const MAX_NAME = 120;
const MAX_PHONE = 40;
const MAX_MESSAGE = 4000;

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Validates an untrusted request body. The API route is public, so nothing
 * from the client is trusted to be a string, present, or a sane length.
 */
export function validateContactPayload(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "Invalid request body." };
  }

  const raw = body as Record<string, unknown>;
  const name = asTrimmedString(raw.name);
  const email = asTrimmedString(raw.email);
  const phone = asTrimmedString(raw.phone);
  const message = asTrimmedString(raw.message);

  if (!name) return { ok: false, error: "Please enter your name." };
  if (name.length > MAX_NAME) return { ok: false, error: "That name is too long." };

  if (!email) return { ok: false, error: "Please enter your email address." };
  if (!isValidEmail(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  if (phone.length > MAX_PHONE) {
    return { ok: false, error: "That phone number is too long." };
  }

  if (!message) return { ok: false, error: "Please enter a message." };
  if (message.length > MAX_MESSAGE) {
    return { ok: false, error: "That message is too long." };
  }

  return {
    ok: true,
    data: { name, email, phone: phone || null, message },
  };
}
