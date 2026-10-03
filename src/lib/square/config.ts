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

/**
 * Names of Square menu groups that are NOT available Friday-Sunday (Order
 * Online only - checkout blocks them when today is Fri/Sat/Sun). The inverse
 * of WEEKEND_ONLY_CATEGORY_NAMES. Same name-based, case-insensitive matching.
 */
export const WEEKDAY_ONLY_CATEGORY_NAMES = ["Chinese Fast Food (week days only)"];

// Both "Menu" and "Catering" share this cache tag/window since they're
// fetched the same way and change on the same cadence (whenever someone
// edits the Square catalog, which the restaurant said is infrequent).
export const SQUARE_MENU_CACHE_TAG = "square-menu";
export const SQUARE_MENU_REVALIDATE_SECONDS = 3600;

/**
 * The Square Application name(s) our own checkout orders carry as
 * `order.source.name`.
 *
 * VERIFIED AGAINST PRODUCTION (location LB0KX3K7ZE1WF): of 17,369 orders in a
 * 90-day window, exactly 5 carried the source name "Biryani Catering", and
 * those 5 were precisely the orders our checkout created. Every other channel
 * reports its own distinct name - "Point of Sale", "DoorDash", "UberEats",
 * "Grubhub", "Square Online" - so this value cleanly separates our orders
 * server-side.
 *
 * The app was later renamed in the Square Developer Portal to
 * "BOMMARILLU BIRYANI  425-420-0160" (verified against production: note the
 * double space between "BIRYANI" and "425" - that is the real string Square
 * sends, not a typo to "fix"). Both names are kept here because real paid
 * orders exist under the old name and the allowlist is exact-match: dropping
 * it would make those orders silently disappear from the dashboard.
 *
 * Both our flows share this, because catering and online ordering go through
 * the same Square application. Catering vs. menu is NOT distinguishable from
 * it; that is what `metadata.channel` is for.
 *
 * Overridable (comma-separated) because this is the Square *application*
 * name: renaming the app again in the Square Developer Portal would change
 * the string, and the old name(s) should stay in this list rather than being
 * replaced, for the same reason.
 */
const PORTAL_SOURCE_NAME_DEFAULTS = [
  "Biryani Catering",
  "BOMMARILLU BIRYANI  425-420-0160",
];

export function getPortalSourceNames(): string[] {
  const override = process.env.SQUARE_PORTAL_SOURCE_NAME?.trim();
  if (!override) return PORTAL_SOURCE_NAME_DEFAULTS;

  return override
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}
