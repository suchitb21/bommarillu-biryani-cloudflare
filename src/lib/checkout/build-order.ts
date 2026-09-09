import "server-only";
import type { Square } from "square";
import { randomUUID } from "node:crypto";
import { getSquareClient, getSquareLocationId } from "@/lib/square/client";
import { zonedDateTimeToUtc } from "@/lib/time-slots";
import type { CartLine } from "@/lib/cart/types";
import type { CheckoutAddress, CheckoutChannel, FulfillmentMethod } from "./types";

/**
 * Line items reference the real, live catalog by id and let Square resolve
 * the price server-side - Square's own guidance is explicit about this:
 * catalog-referenced line items "inherit the catalog price" and you should
 * not submit client-supplied prices. Our cart's stored priceCents is only
 * ever used to *display* a running total to the shopper before checkout;
 * it's never trusted as the real charge.
 */
function buildLineItems(lines: CartLine[]): Square.OrderLineItem[] {
  return lines.map((line) => ({
    catalogObjectId: line.variationId,
    quantity: String(line.quantity),
    modifiers: line.modifiers.map((modifier) => ({ catalogObjectId: modifier.id })),
  }));
}

function buildAddress(address: CheckoutAddress): Square.Address {
  return {
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 || undefined,
    locality: address.city,
    administrativeDistrictLevel1: address.state,
    postalCode: address.postalCode,
    country: "US",
  };
}

function formatSlotForNote(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const dateLabel = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return `${dateLabel} at ${displayHour}:${minute.toString().padStart(2, "0")} ${period} PT`;
}

type BuildFulfillmentArgs = {
  name: string;
  phone: string;
  fulfillmentMethod: FulfillmentMethod;
  /** Catering "delivery" only - captured for staff to arrange delivery. */
  address?: CheckoutAddress;
  dateStr: string;
  timeStr: string;
  noteContext: string;
};

/**
 * Every order created here gets exactly one PICKUP fulfillment (the Orders
 * API allows at most one fulfillment per created order, and Square's managed
 * courier dispatch does not exist for API-created orders anyway - see
 * src/lib/delivery.ts). Order Online is pickup-only; a catering order where
 * the customer chose "delivery" stays a PICKUP with the delivery address on
 * the recipient and spelled out in the note, so staff can arrange it
 * themselves (catering orders are too large for courier partners).
 */
function buildFulfillment(args: BuildFulfillmentArgs): Square.Fulfillment {
  const { name, phone, fulfillmentMethod, address, dateStr, timeStr, noteContext } = args;
  const whenLabel = formatSlotForNote(dateStr, timeStr);
  const instant = zonedDateTimeToUtc(dateStr, timeStr).toISOString();

  const isDelivery = fulfillmentMethod === "delivery";
  const addressLine = address
    ? `${address.addressLine1}${address.addressLine2 ? ", " + address.addressLine2 : ""}, ${address.city}, ${address.state} ${address.postalCode}`
    : null;

  const noteParts = [noteContext, `Requested: ${whenLabel}`];
  if (isDelivery && addressLine) {
    noteParts.push(`CATERING DELIVERY (restaurant-arranged) to: ${addressLine}`);
  } else {
    noteParts.push("Pickup at the restaurant");
  }
  const note = noteParts.join(" | ").slice(0, 500);

  return {
    type: "PICKUP",
    pickupDetails: {
      recipient: {
        displayName: name,
        phoneNumber: phone,
        address: isDelivery && address ? buildAddress(address) : undefined,
      },
      scheduleType: "SCHEDULED",
      pickupAt: instant,
      note,
    },
  };
}

export type CreateCheckoutArgs = {
  lines: CartLine[];
  name: string;
  phone: string;
  fulfillmentMethod: FulfillmentMethod;
  address?: CheckoutAddress;
  dateStr: string;
  timeStr: string;
  noteContext: string;
  /** Structured channel tag, written to `order.metadata.channel`. The prose
   * `noteContext` above is only ever used for the fulfillment note. */
  channel: CheckoutChannel;
  redirectUrl: string;
};

export async function createCheckout(args: CreateCheckoutArgs): Promise<{ url: string }> {
  const client = getSquareClient();
  const locationId = getSquareLocationId();

  const fulfillment = buildFulfillment(args);

  const order: Square.Order = {
    locationId,
    referenceId: randomUUID(),
    metadata: { channel: args.channel },
    lineItems: buildLineItems(args.lines),
    fulfillments: [fulfillment],
  };

  const createOrderResponse = await client.orders.create({
    order,
    idempotencyKey: randomUUID(),
  });

  const createdOrder = createOrderResponse.order;
  if (!createdOrder?.id || createdOrder.version == null) {
    throw new Error("Square did not return a valid order.");
  }

  const paymentLinkResponse = await client.checkout.paymentLinks.create({
    idempotencyKey: randomUUID(),
    order: {
      id: createdOrder.id,
      locationId,
      version: createdOrder.version,
    },
    checkoutOptions: {
      redirectUrl: `${args.redirectUrl}?orderId=${createdOrder.id}`,
    },
  });

  const url = paymentLinkResponse.paymentLink?.url;
  if (!url) {
    throw new Error("Square did not return a payment link URL.");
  }

  return { url };
}
