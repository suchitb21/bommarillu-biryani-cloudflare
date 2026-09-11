#!/usr/bin/env node
/**
 * Generates the ADMIN_PASSWORD_HASH value for the admin dashboard.
 *
 *   node scripts/hash-admin-password.mjs 'your-password'
 *
 * Copy the printed line into .env.local (locally) and into your Vercel
 * project's environment variables (for production).
 */
import { randomBytes, scrypt } from "node:crypto";

const KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

const password = process.argv[2];

if (!password) {
  console.error(
    "Usage: node scripts/hash-admin-password.mjs 'your-password'\n\n" +
      "Wrap the password in single quotes so your shell does not interpret it."
  );
  process.exit(1);
}

if (password.length < 12) {
  console.error(
    `Refusing to hash a ${password.length}-character password. Use at least 12 characters - ` +
      "this single password protects every order and customer message."
  );
  process.exit(1);
}

const salt = randomBytes(16);

scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS, (error, key) => {
  if (error) throw error;
  // Colon-separated on purpose. Next.js's env loader expands `$NAME`
  // references inside .env files, so a `$`-separated hash silently collapses
  // to the literal string "scrypt" by the time the app reads it.
  console.log(`ADMIN_PASSWORD_HASH=scrypt:${salt.toString("hex")}:${key.toString("hex")}`);
});
