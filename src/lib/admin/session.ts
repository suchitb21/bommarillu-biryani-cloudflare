import {
  SESSION_TTL_SECONDS,
  getAdminPasswordHash,
  getSessionSecret,
} from "./config";

/**
 * Stateless session tokens: `<base64url payload>.<base64url HMAC-SHA256>`.
 *
 * Uses Web Crypto rather than `node:crypto` so this module is safe to import
 * from `src/proxy.ts` regardless of which runtime it is deployed to. There is
 * no server-side session store, so signing out is a matter of dropping the
 * cookie (see the logout route).
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function sign(payload: string): Promise<Uint8Array> {
  const signature = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(),
    encoder.encode(payload)
  );
  return new Uint8Array(signature);
}

/**
 * Binds a session to the password that created it, so changing
 * ADMIN_PASSWORD_HASH invalidates every outstanding session immediately -
 * without also having to rotate SESSION_SECRET.
 */
async function passwordVersion(): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(getAdminPasswordHash())
  );
  return toBase64Url(new Uint8Array(digest).slice(0, 12));
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a[i] ^ b[i];
  return difference === 0;
}

export async function createSessionToken(): Promise<string> {
  const payload = toBase64Url(
    encoder.encode(
      JSON.stringify({
        exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
        pv: await passwordVersion(),
      })
    )
  );
  const signature = toBase64Url(await sign(payload));
  return `${payload}.${signature}`;
}

export async function verifySessionToken(
  token: string | undefined
): Promise<boolean> {
  if (!token) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  try {
    const expected = await sign(payload);
    if (!constantTimeEqual(expected, fromBase64Url(signature))) return false;

    const decoded = JSON.parse(decoder.decode(fromBase64Url(payload))) as {
      exp?: unknown;
      pv?: unknown;
    };

    if (typeof decoded.exp !== "number") return false;
    if (decoded.exp * 1000 < Date.now()) return false;

    return decoded.pv === (await passwordVersion());
  } catch {
    // Any malformed input is simply not a valid session.
    return false;
  }
}
