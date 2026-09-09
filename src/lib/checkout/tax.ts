/**
 * Sales tax applied to every order, shared by:
 * - the checkout forms (client-side display of subtotal / tax / total), and
 * - order creation (the tax line attached to the Square order so Square's
 *   checkout charges exactly what we displayed).
 *
 * The restaurant's food sales tax is 10.4%. Note this is NOT applied
 * automatically when the order is created via the API - Square only
 * auto-applies taxes that are attached to catalog items, and this account's
 * tax lives in its hosted-ordering configuration - so we add it explicitly
 * as an ad-hoc order tax at the same rate the forms display.
 *
 * Keep this file free of "server-only" imports: it runs in the browser
 * (CheckoutForm) and on the server (build-order.ts).
 */
export const SALES_TAX_PERCENT = 10.4;
export const SALES_TAX_NAME = "Sales tax";

export function salesTaxRate(): number {
  return SALES_TAX_PERCENT / 100;
}

/** Tax on a pre-tax subtotal, rounded to cents (half up). */
export function computeSalesTaxCents(subtotalCents: number): number {
  return Math.round(subtotalCents * salesTaxRate());
}
