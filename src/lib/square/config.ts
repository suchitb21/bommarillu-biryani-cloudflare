// Centralizes the Square Menu names so the fetch layer never hardcodes
// catalog object ids - resolved live by name on every request instead.
export const SQUARE_MENU_NAMES = {
  onlineOrdering: "Menu",
  catering: "Catering-BB",
} as const;

// Both "Menu" and "Catering-BB" share this cache tag/window since they're
// fetched the same way and change on the same cadence (whenever someone
// edits the Square catalog, which the restaurant said is infrequent).
export const SQUARE_MENU_CACHE_TAG = "square-menu";
export const SQUARE_MENU_REVALIDATE_SECONDS = 3600;
