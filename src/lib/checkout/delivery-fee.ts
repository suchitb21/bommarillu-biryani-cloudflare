/**
 * Flat, NON-TAXABLE delivery fee charged when a CATERING order is delivered.
 * (Catering delivery is arranged by staff - see design.md - and the
 * restaurant charges a fixed fee for it.) Pickup orders - catering or Order
 * Online - have no fee.
 *
 * Shared by:
 * - the catering checkout form (display: a "Delivery fee (non-taxable)" row
 *   that is excluded from the 10.4% tax base), and
 * - order creation (an order service charge with `taxable: false`, so Square
 *   charges exactly what the form showed).
 *
 * Client + server safe (no "server-only" import).
 */
export const CATERING_DELIVERY_FEE_NAME = "Delivery fee";
export const CATERING_DELIVERY_FEE_CENTS = 10000; // $100.00
