// Centralizes the Square Menu names so the fetch layer never hardcodes
// catalog object ids - resolved live by name on every request instead.
export const SQUARE_MENU_NAMES = {
  onlineOrdering: "Menu",
  catering: "Catering",
} as const;

/**
 * Names of existing Square menu groups (in either "Menu" or "Catering")
 * whose items are only made Friday-Sunday. These are the restaurant's own
 * display sections - no separate hidden tag category needed. Matching is by
 * name only (not scoped to a specific top-level menu), so the same name
 * works in both menus, and is case-insensitive. Add a name here if a new
 * weekend-only section is created in Square.
 */
export const WEEKEND_ONLY_CATEGORY_NAMES = [
  "WEEKEND BIRYANI",
  "Mutton Curry - WEEKENDS",
  "WEEKENDS SPECIALS (FRI -SAT-SUN)",
];

// Both "Menu" and "Catering" share this cache tag/window since they're
// fetched the same way and change on the same cadence (whenever someone
// edits the Square catalog, which the restaurant said is infrequent).
export const SQUARE_MENU_CACHE_TAG = "square-menu";
export const SQUARE_MENU_REVALIDATE_SECONDS = 3600;

/**
 * The Square Application name our own checkout orders carry as
 * `order.source.name`.
 *
 * VERIFIED AGAINST PRODUCTION (location LB0KX3K7ZE1WF): of 17,369 orders in a
 * 90-day window, exactly 5 carried this source name, and those 5 were
 * precisely the orders our checkout created. Every other channel reports its
 * own distinct name - "Point of Sale", "DoorDash", "UberEats", "Grubhub",
 * "Square Online" - so this value cleanly separates our orders server-side.
 *
 * Both our flows share it, because catering and online ordering go through the
 * same Square application. Catering vs. menu is NOT distinguishable from it;
 * that is what `metadata.channel` is for.
 *
 * Overridable because this is the Square *application* name: renaming the app
 * in the Square Developer Portal would change the string.
 */
const PORTAL_SOURCE_NAME_DEFAULT = "Biryani Catering";

export function getPortalSourceName(): string {
  return (
    process.env.SQUARE_PORTAL_SOURCE_NAME?.trim() || PORTAL_SOURCE_NAME_DEFAULT
  );
}
