export type CartLineModifier = {
  id: string;
  name: string;
  priceCents: number;
};

/**
 * Which Square Menu the item was added from. "Menu" and "Catering-BB" are
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
  unitPriceCents: number;
  modifiers: CartLineModifier[];
  quantity: number;
  source: CartSource;
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
