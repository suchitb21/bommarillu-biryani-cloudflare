import type { CartLine } from "@/lib/cart/types";

/** Which fulfillment the order is created with. "delivery" is Catering-only:
 * catering delivery is staff-arranged and is still created as a PICKUP
 * fulfillment with the address captured for staff. Order Online is
 * pickup-only on this site - its delivery redirects to the Cash App /
 * Square ordering profile (see src/lib/delivery.ts). */
export type FulfillmentMethod = "pickup" | "delivery";

/** Which checkout flow created the order. Written to every order as
 * order-level `metadata.channel` so staff can tell the two flows apart in
 * the Square Dashboard without parsing the fulfillment note (which stays
 * human-readable prose - see noteContext in build-order.ts). */
export type CheckoutChannel = "order-online" | "catering";

export type CheckoutAddress = {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
};

export type OrderOnlineCheckoutRequest = {
  name: string;
  phone: string;
  /** Always "pickup" - Order Online delivery redirects to the restaurant's
   * Cash App / Square ordering profile (see src/lib/delivery.ts), so this
   * endpoint never receives a delivery order. */
  fulfillmentMethod: "pickup";
  /** "HH:mm", always Pacific time - the date is always today, computed
   * server-side (never trust the client for "what day is it"). */
  timeSlot: string;
  lines: CartLine[];
};

export type CateringCheckoutRequest = {
  name: string;
  phone: string;
  fulfillmentMethod: FulfillmentMethod;
  /** Required when fulfillmentMethod is "delivery". */
  address?: CheckoutAddress;
  /** Required when fulfillmentMethod is "delivery" - the customer's
   * self-selected distance band (see CATERING_DELIVERY_TIERS in
   * delivery-fee.ts), which drives the delivery fee. */
  deliveryDistanceTierId?: string;
  /** "YYYY-MM-DD", Pacific calendar date of the event. */
  eventDate: string;
  /** "HH:mm", always Pacific time. */
  timeSlot: string;
  /** Optional free-text instructions for the kitchen (allergies, setup...). */
  specialInstructions?: string;
  lines: CartLine[];
};

export type CheckoutSuccessResponse = { ok: true; url: string };
export type CheckoutErrorResponse = { ok: false; error: string };
export type CheckoutResponse = CheckoutSuccessResponse | CheckoutErrorResponse;
