import "server-only";
import { scrypt, timingSafeEqual } from "node:crypto";
import { getAdminPasswordHash } from "./config";

/**
 * Password verification against a scrypt hash.
 *
 * `server-only` because this pulls in node:crypto - it must never be bundled
 * into a Client Component. The proxy only ever verifies the *session token*
 * (see session.ts); the password itself is checked solely in the login route.
 */

const KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const stored = getAdminPasswordHash();
  const [scheme, saltHex, hashHex] = stored.split("$");

  if (scheme !== "scrypt" || !saltHex || !hashHex) {
    throw new Error(
      "ADMIN_PASSWORD_HASH is malformed. It should look like scrypt$<saltHex>$<hashHex> - regenerate it with scripts/hash-admin-password.mjs."
    );
  }

  const expected = Buffer.from(hashHex, "hex");
  const actual = await deriveKey(password, Buffer.from(saltHex, "hex"));

  // Length check first: timingSafeEqual throws on a length mismatch.
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
