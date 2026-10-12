import "server-only";
import { unstable_cache } from "next/cache";
import { listAll } from "./store";
import { activeEntries, type SoldOutEntry } from "./logic";

export const SOLD_OUT_CACHE_TAG = "sold-out";

/** Raw rows are cached briefly (a toggle in the admin busts the tag at once).
 * Expiry is NOT part of the cache: rows are filtered against the real clock on
 * every call, so a "today only" entry ends exactly at midnight even while the
 * cached list is up to 30 s old. */
const CACHE_SECONDS = 30;

const cachedRows = unstable_cache(listAll, ["sold-out-rows"], {
  revalidate: CACHE_SECONDS,
  tags: [SOLD_OUT_CACHE_TAG],
});

/**
 * Entries that are sold out right now. Fails open: if the database cannot be
 * read, log it and report nothing sold out, so a database blip never hides the
 * whole menu or blocks every order.
 */
export async function getActiveSoldOut(now: Date = new Date()): Promise<SoldOutEntry[]> {
  try {
    return activeEntries(await cachedRows(), now);
  } catch (error) {
    console.error("[sold-out] Could not read sold-out list; treating nothing as sold out:", error);
    return [];
  }
}
