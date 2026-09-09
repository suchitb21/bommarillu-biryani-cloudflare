import "server-only";
import type { Square } from "square";
import { randomUUID } from "node:crypto";
import { getSquareClient, getSquareLocationId } from "@/lib/square/client";
import { zonedDateTimeToUtc } from "@/lib/time-slots";
import type { CartLine } from "@/lib/cart/types";
import type { CheckoutAddress, FulfillmentMethod } from "./types";

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
  address?: CheckoutAddress;
  dateStr: string;
  timeStr: string;
  /** true = real Square On-Demand Delivery dispatch. false = fulfillment
   * type stays PICKUP even when the customer chose delivery, with the
   * address/time captured only as structured recipient data + a note for
   * staff to arrange manually (used for Catering, per restaurant policy -
   * their orders are too large for Square's courier partners). */
  allowOnDemandDelivery: boolean;
  noteContext: string;
};

/** Builds the single Fulfillment allowed on an order created via the API. */
function buildFulfillment(args: BuildFulfillmentArgs): Square.Fulfillment {
  const { name, phone, fulfillmentMethod, address, dateStr, timeStr, allowOnDemandDelivery, noteContext } = args;
  const whenLabel = formatSlotForNote(dateStr, timeStr);
  const instant = zonedDateTimeToUtc(dateStr, timeStr).toISOString();

  const isDelivery = fulfillmentMethod === "delivery";
  const useSquareDelivery = isDelivery && allowOnDemandDelivery;

  const addressLine = address
    ? `${address.addressLine1}${address.addressLine2 ? ", " + address.addressLine2 : ""}, ${address.city}, ${address.state} ${address.postalCode}`
    : null;

  const noteParts = [noteContext, `Requested: ${whenLabel}`];
  if (isDelivery && addressLine) {
    noteParts.push(
      useSquareDelivery ? `Deliver to: ${addressLine}` : `CATERING DELIVERY (restaurant-arranged) to: ${addressLine}`
    );
  } else {
    noteParts.push("Pickup at the restaurant");
  }
  const note = noteParts.join(" | ").slice(0, 500);

  if (useSquareDelivery) {
    return {
      type: "DELIVERY",
      deliveryDetails: {
        recipient: {
          displayName: name,
          phoneNumber: phone,
          address: address ? buildAddress(address) : undefined,
        },
        scheduleType: "SCHEDULED",
        deliverAt: instant,
        dropoffNotes: note,
      },
    };
  }

  return {
    type: "PICKUP",
    pickupDetails: {
      recipient: {
        displayName: name,
        phoneNumber: phone,
        address: !useSquareDelivery && isDelivery && address ? buildAddress(address) : undefined,
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
  allowOnDemandDelivery: boolean;
  noteContext: string;
  redirectUrl: string;
};

export async function createCheckout(args: CreateCheckoutArgs): Promise<{ url: string }> {
  const client = getSquareClient();
  const locationId = getSquareLocationId();

  const fulfillment = buildFulfillment(args);

  const order: Square.Order = {
    locationId,
    referenceId: randomUUID(),
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
