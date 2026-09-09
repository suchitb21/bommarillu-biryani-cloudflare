import "server-only";

/**
 * The Square SDK returns `bigint` for money amounts and a few other fields.
 * `JSON.stringify` throws the instant it hits a bigint anywhere in the tree,
 * so any Square SDK response that needs to leave the server (Route Handler
 * response, prop into a Client Component) must go through this first.
 */
export function serializeBigInts<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => (typeof v === "bigint" ? v.toString() : v))
  );
}
