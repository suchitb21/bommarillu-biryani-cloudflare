import "server-only";
import type { Square } from "square";
import { randomUUID } from "node:crypto";
import { getSquareClient, getSquareLocationId } from "@/lib/square/client";
import { zonedDateTimeToUtc } from "@/lib/time-slots";
import type { CartLine } from "@/lib/cart/types";
import type { CheckoutAddress, CheckoutChannel, FulfillmentMethod } from "./types";
import { SALES_TAX_NAME, SALES_TAX_PERCENT } from "./tax";
import { CATERING_DELIVERY_FEE_NAME } from "./delivery-fee";

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
  /** Catering only - customer's free-text special instructions, appended to
   * the fulfillment note so staff see them with the ticket. */
  specialInstructions?: string;
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
  const { name, phone, fulfillmentMethod, address, dateStr, timeStr, noteContext, specialInstructions } = args;
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
  if (specialInstructions?.trim()) {
    noteParts.push(`Special instructions: ${specialInstructions.trim()}`);
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
  /** Catering only - customer's free-text special instructions. */
  specialInstructions?: string;
  /** Catering "delivery" only - the fee amount, already resolved server-side
   * from the customer's chosen distance band (see delivery-fee.ts). Omitted
   * (or a pickup order) means no delivery service charge is added. */
  deliveryFeeCents?: number;
  /** Catering "delivery" only - the chosen distance band's display label
   * (e.g. "6 to 10 miles"), written to `order.metadata` so the admin
   * dashboard can show it. Metadata (not the note) because it's small,
   * structured, and read back directly rather than parsed out of prose. */
  deliveryDistanceLabel?: string;
  /** Structured channel tag, written to `order.metadata.channel`. The prose
   * `noteContext` above is only ever used for the fulfillment note. */
  channel: CheckoutChannel;
  /** Base confirmation URL (no query string) - this function appends the
   * order's own `?ref=<referenceId>` so the confirmation page can find the
   * order after the customer returns from Square's hosted checkout. */
  redirectUrl: string;
};

/**
 * Square creates the order and the payment link in ONE documented call -
 * CreatePaymentLink with a full `order` embedded (an existing order cannot
 * be referenced in the request, per Square's "Guidelines and Limitations").
 *
 * The order carries:
 * - `referenceId` = our own token (`bb-<uuid>`), also appended to
 *   `redirectUrl` as `?ref=`, so /order-confirmation can look the order up
 *   by scanning recent SearchOrders results even when Square doesn't append
 *   an `orderId` to the redirect (sandbox never does; production does).
 * - `metadata.channel` = "order-online" | "catering" for the Dashboard.
 * - tipping enabled on Square's hosted payment page (dollar tips, kept and
 *   reported by Square; staff see the tip with the payment).
 * - an explicit ad-hoc ORDER-scoped sales tax at SALES_TAX_PERCENT (10.4%).
 *   Square does NOT auto-apply this account's tax to API-created orders (its
 *   tax is configured for Square's hosted-ordering surfaces, not on catalog
 *   items), so we add the tax ourselves - the same constant the checkout
 *   forms display, meaning Square charges what the customer saw.
 * - catering "delivery" orders also get a NON-TAXABLE delivery fee (amount
 *   banded by distance - see `deliveryFeeCents` and delivery-fee.ts) as an
 *   order service charge with `taxable: false`, so it sits outside the tax
 *   base. Pickup orders have no fee.
 * - catalog-referenced line items only - prices are Square's, never ours.
 */
export async function createCheckout(args: CreateCheckoutArgs): Promise<{ url: string }> {
  const client = getSquareClient();
  const locationId = getSquareLocationId();

  // Square's `reference_id` charset is letters, digits, "-" and "_" (max 40
  // chars); "bb-" + UUID stays well within that.
  const referenceId = `bb-${randomUUID()}`;

  const fulfillment = buildFulfillment(args);

  // Only catering can be "delivery" on this site (the Order Online route is
  // pickup-only), so a delivery order gets the NON-TAXABLE, distance-banded
  // fee as an order service charge - excluded from the tax base above, and
  // shown as its own row on the catering form.
  const isDelivery = args.fulfillmentMethod === "delivery" && Boolean(args.deliveryFeeCents);

  const order: Square.Order = {
    locationId,
    referenceId,
    metadata: {
      channel: args.channel,
      ...(isDelivery && args.deliveryDistanceLabel
        ? { cateringDeliveryDistance: args.deliveryDistanceLabel }
        : {}),
    },
    lineItems: buildLineItems(args.lines),
    fulfillments: [fulfillment],
    taxes: [
      {
        uid: "sales-tax",
        name: SALES_TAX_NAME,
        type: "ADDITIVE",
        percentage: String(SALES_TAX_PERCENT),
        scope: "ORDER",
      },
    ],
    ...(isDelivery
      ? {
          serviceCharges: [
            {
              uid: "catering-delivery-fee",
              name: CATERING_DELIVERY_FEE_NAME,
              amountMoney: {
                amount: BigInt(args.deliveryFeeCents ?? 0),
                currency: "USD",
              },
              // Required by Square's Orders API. TOTAL_PHASE applies the fee
              // after tax is calculated on the subtotal, which is also the
              // only calculation phase Square allows for a non-taxable
              // service charge (see OrderServiceCharge.calculationPhase).
              calculationPhase: "TOTAL_PHASE",
              taxable: false,
              scope: "ORDER",
            },
          ],
        }
      : {}),
  };

  const paymentLinkResponse = await client.checkout.paymentLinks.create({
    idempotencyKey: randomUUID(),
    order,
    checkoutOptions: {
      allowTipping: true,
      redirectUrl: `${args.redirectUrl}?ref=${referenceId}`,
    },
  });

  const url = paymentLinkResponse.paymentLink?.url;
  if (!url) {
    throw new Error("Square did not return a payment link URL.");
  }

  return { url };
}
