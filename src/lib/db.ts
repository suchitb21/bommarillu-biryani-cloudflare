import "server-only";
import { neon } from "@neondatabase/serverless";

/**
 * Neon's HTTP driver: one round trip per query and no connection pool to
 * manage, which suits short-lived route handlers. The client is created once
 * per server process and reused, the same way getSquareClient() caches its own.
 */
let cachedSql: ReturnType<typeof neon> | undefined;

export function getSql(): ReturnType<typeof neon> {
  if (cachedSql) return cachedSql;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add the pooled Neon connection string to .env.local."
    );
  }

  cachedSql = neon(connectionString);
  return cachedSql;
}
