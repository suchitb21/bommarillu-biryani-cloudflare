import "server-only";
import { getMenuByName } from "@/lib/square/menu";
import { getActiveSoldOut } from "./read";
import { soldOutItemNames } from "./logic";

/**
 * Names of cart items that are sold out right now, for the checkout endpoints.
 * Server-side defense in depth: the page greys sold-out items, but a cart
 * built earlier (or a tampered request) must not be able to order them.
 * Fails open like the rest of this feature - if the menu or the list cannot be
 * read, order creation proceeds rather than every checkout being blocked.
 */
export async function findSoldOutItemNames(
  menuName: string,
  lines: Array<{ itemId: string; itemName: string }>
): Promise<string[]> {
  try {
    const active = await getActiveSoldOut();
    if (active.length === 0) return [];
    const menu = await getMenuByName(menuName);
    return soldOutItemNames(lines, menu, active);
  } catch (error) {
    console.error("[sold-out] Checkout check failed; allowing the order:", error);
    return [];
  }
}
