/**
 * Minimum pre-tax subtotal required to check out a catering order.
 *
 * Client + server safe (no "server-only" import) - shared by the catering
 * cart panel (disables "Continue to details" below this) and the catering
 * checkout route (defense in depth, re-checked from the submitted lines).
 */
export const CATERING_MINIMUM_ORDER_CENTS = 50000; // $500.00
