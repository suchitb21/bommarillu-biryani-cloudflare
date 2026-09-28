/**
 * NON-TAXABLE delivery fee charged when a CATERING order is delivered,
 * banded by distance from the restaurant. (Catering delivery is
 * staff-arranged - see design.md.) There is no distance API involved: the
 * customer self-selects the band that matches how far they are, and the
 * Terms & Conditions warn that misrepresenting distance can mean the order
 * is cancelled and a penalty charged. Pickup orders - catering or Order
 * Online - have no fee.
 *
 * Shared by:
 * - the catering checkout form (a distance dropdown that drives the
 *   displayed "Delivery fee (non-taxable)" row, excluded from the 10.4% tax
 *   base), and
 * - the catering checkout route, which re-derives the fee server-side from
 *   the submitted tier id rather than trusting a client-supplied amount, and
 *   order creation (an order service charge with `taxable: false`, so
 *   Square charges exactly what the form showed).
 *
 * Client + server safe (no "server-only" import).
 */
export const CATERING_DELIVERY_FEE_NAME = "Delivery fee";

/** Beyond this, delivery is not offered at all - see Terms & Conditions. */
export const CATERING_DELIVERY_MAX_MILES = 20;

export type CateringDeliveryTier = {
  id: string;
  /** Shown in the distance dropdown. */
  label: string;
  feeCents: number;
};

export const CATERING_DELIVERY_TIERS: CateringDeliveryTier[] = [
  { id: "0-6", label: "Up to 6 miles", feeCents: 4000 }, // $40.00
  { id: "6-10", label: "6 to 10 miles", feeCents: 6000 }, // $60.00
  { id: "10-15", label: "10 to 15 miles", feeCents: 8000 }, // $80.00
  { id: "15-20", label: "15 to 20 miles", feeCents: 10000 }, // $100.00
];

export function getCateringDeliveryTier(
  id: string | null | undefined
): CateringDeliveryTier | undefined {
  return CATERING_DELIVERY_TIERS.find((tier) => tier.id === id);
}
