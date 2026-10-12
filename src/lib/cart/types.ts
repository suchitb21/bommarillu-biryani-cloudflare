export type CartLineModifier = {
  id: string;
  name: string;
  priceCents: number;
};

/**
 * Which Square Menu the item was added from. "Menu" and "Catering" are
 * separate catalogs with separate item/variation ids and separate pricing
 * (see design.md) - this just carries a human-readable label through the
 * cart so the same-named dish from each isn't indistinguishable in the UI.
 * It is not sent to Square per line item: the two carts can never mix, so
 * checkout distinguishes the two flows with order-level metadata instead
 * (`metadata.channel`, see src/lib/checkout/types.ts and build-order.ts).
 */
export type CartSource = "menu" | "catering";

export const CART_SOURCE_LABELS: Record<CartSource, string> = {
  menu: "Order Online",
  catering: "Catering",
};

export type CartLine = {
  /** Deterministic key (item + variation + sorted modifier ids) so re-adding
   * the same configuration bumps quantity instead of creating a duplicate line. */
  lineId: string;
  itemId: string;
  itemName: string;
  imageUrl?: string;
  variationId: string;
  variationName: string;
  /** Base item-variation unit price in cents - EXCLUDING modifiers. Modifier
   * costs ride in `modifiers` and are added by `lineTotalCents`, so totals
   * can never double-count them. */
  unitPriceCents: number;
  modifiers: CartLineModifier[];
  quantity: number;
  source: CartSource;
  /** True when this item is weekend-only in Square (see
   * WEEKEND_ONLY_CATEGORY_NAMES) - checkout restricts ordering to
   * Friday-Sunday when any line has this set. */
  isWeekendOnly: boolean;
  /** True when this item is not available Friday-Sunday (see
   * WEEKDAY_ONLY_CATEGORY_NAMES) - Order Online checkout blocks the order
   * when today is a weekend day. */
  isWeekdayOnly: boolean;
};

export function buildLineId(
  itemId: string,
  variationId: string,
  modifierIds: string[]
): string {
  return [itemId, variationId, ...[...modifierIds].sort()].join("::");
}

export function lineTotalCents(line: CartLine): number {
  const modifiersCents = line.modifiers.reduce((sum, m) => sum + m.priceCents, 0);
  return (line.unitPriceCents + modifiersCents) * line.quantity;
}

/** Distinct names of the cart's weekend-only items, for naming them to the
 * customer when a date blocks checkout. */
export function weekendOnlyItemNames(lines: CartLine[]): string[] {
  return uniqueNames(lines.filter((line) => line.isWeekendOnly));
}

/** Distinct names of the cart's Monday-Thursday-only items. */
export function weekdayOnlyItemNames(lines: CartLine[]): string[] {
  return uniqueNames(lines.filter((line) => line.isWeekdayOnly));
}

function uniqueNames(lines: CartLine[]): string[] {
  return [...new Set(lines.map((line) => line.itemName))];
}

/** "Veggie Noodles", "A and B", "A, B and C" - for naming items in a sentence. */
export function joinItemNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** e.g. "Veggie Noodles is only available Monday–Thursday." */
export function unavailableItemsSentence(names: string[], days: string): string {
  const verb = names.length > 1 ? "are" : "is";
  return `${joinItemNames(names)} ${verb} only available ${days}.`;
}

/** e.g. "Veggie Noodles is sold out right now. Please remove it from your cart to continue." */
export function soldOutMessage(names: string[]): string {
  const plural = names.length > 1;
  return `${joinItemNames(names)} ${plural ? "are" : "is"} sold out right now. Please remove ${plural ? "them" : "it"} from your cart to continue.`;
}
