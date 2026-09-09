import type { CartLine } from "@/lib/cart/types";

export type FulfillmentMethod = "pickup" | "delivery";

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
  fulfillmentMethod: FulfillmentMethod;
  /** Required when fulfillmentMethod is "delivery". */
  address?: CheckoutAddress;
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
  /** "YYYY-MM-DD", Pacific calendar date of the event. */
  eventDate: string;
  /** "HH:mm", always Pacific time. */
  timeSlot: string;
  lines: CartLine[];
};

export type CheckoutSuccessResponse = { ok: true; url: string };
export type CheckoutErrorResponse = { ok: false; error: string };
export type CheckoutResponse = CheckoutSuccessResponse | CheckoutErrorResponse;
