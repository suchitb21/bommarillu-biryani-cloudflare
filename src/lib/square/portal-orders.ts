import "server-only";
import type { Square } from "square";
import { getSquareClient, getSquareLocationId } from "@/lib/square/client";
import { getPortalSourceNames } from "@/lib/square/config";
import { getOrderLookbackDays } from "@/lib/admin/config";
import type {
  AdminOrderItemView,
  AdminOrderView,
  PortalChannel,
  PortalOrderSummary,
} from "@/lib/admin/types";

/**
 * Reads the orders this website created out of Square.
 *
 * Square is the system of record, so there is no local orders table. The read
 * is narrowed server-side by a source-name allowlist (see getPortalSourceNames),
 * which is what keeps this cheap: filtering afterwards in our own code meant
 * downloading every order at the location first.
 *
 * Catering vs. online ordering is then decided from `metadata.channel`, since
 * both flows share one Square application name and cannot be told apart by
 * source.
 */

const PAGE_LIMIT = 500;
/** Runaway guard, not a target: 40 x 500 = 20,000 orders. */
const MAX_PAGES = 40;
const CACHE_TTL_MS = 60_000;
const PACIFIC_TIME_ZONE = "America/Los_Angeles";

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: PACIFIC_TIME_ZONE,
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const STATE_LABELS: Record<string, string> = {
  OPEN: "Open",
  COMPLETED: "Completed",
  CANCELED: "Canceled",
  DRAFT: "Draft",
};

/** Internal shape: keeps the raw instant so bucketing happens on real time,
 * and formatting happens exactly once, on the server. */
type RawPortalOrder = {
  id: string;
  referenceId: string;
  channel: PortalChannel;
  scheduledAtMs: number;
  createdAtMs: number;
  isPaid: boolean;
  isDelivery: boolean;
  state: string;
  totalCents: number;
  tipCents: number;
  customerName: string;
  customerPhone: string;
  note: string | null;
  /** Catering delivery only - parsed out of the note (see
   * extractNoteSegment). Null for pickup orders. */
  deliveryAddress: string | null;
  /** Catering delivery only - the chosen distance band's label, read
   * directly from order.metadata (see build-order.ts). Null for pickup
   * orders, and for delivery orders placed before this was captured. */
  deliveryDistanceLabel: string | null;
  /** Catering only - parsed out of the note. "—" when the customer left it
   * blank, matching this file's existing "no value" convention (see
   * customerName/customerPhone above). */
  specialInstructions: string;
  items: AdminOrderItemView[];
};

type RawPortalOrderResult = {
  orders: RawPortalOrder[];
  /** Counted per channel so each page reports only its own hidden orders. */
  skippedUnsettledByChannel: Record<PortalChannel, number>;
  /** Orders from our app that carry no metadata.channel - see readChannel. */
  unclassified: number;
  scannedOrders: number;
};

function formatPacific(ms: number): string {
  if (!Number.isFinite(ms)) return "—";
  return `${dateTimeFormatter.format(new Date(ms))} PT`;
}

function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function toCents(money: Square.Money | undefined): number {
  // Square returns money as bigint cents.
  return Number(money?.amount ?? 0);
}

/**
 * Pulls one " | "-delimited segment out of the fulfillment note written by
 * buildFulfillment (see src/lib/checkout/build-order.ts), by the fixed
 * prefix that writer uses - e.g. "Special instructions: ". Both sides of
 * this are ours, so the prefixes are a contract between the two files, not a
 * guess. Returns null when that segment isn't present (pickup orders have no
 * delivery segment; most orders have no special instructions).
 */
function extractNoteSegment(note: string | null, prefix: string): string | null {
  if (!note) return null;
  const segment = note.split(" | ").find((part) => part.startsWith(prefix));
  return segment ? segment.slice(prefix.length).trim() || null : null;
}

/**
 * Which of our two flows created the order.
 *
 * `metadata.channel` is written by our own checkout, and Square metadata is
 * private to the application that wrote it - so it cannot have been set by the
 * POS, DoorDash, or anyone else. An order that arrives without it therefore
 * came from our app but predates the tag; the caller counts those separately
 * rather than guessing from prose or silently dropping them.
 */
function readChannel(order: Square.Order): PortalChannel | null {
  const metadataChannel = order.metadata?.channel;
  if (metadataChannel === "order-online" || metadataChannel === "catering") {
    return metadataChannel;
  }

  return null;
}

/**
 * True once the customer has actually paid.
 *
 * This matters: creating a payment link creates the order immediately, so an
 * abandoned checkout sits in Square as an unpaid OPEN order. Showing those as
 * "upcoming" would have staff preparing food nobody ordered or paid for.
 */
function isSettled(order: Square.Order): boolean {
  if ((order.tenders?.length ?? 0) > 0) return true;
  if (order.state === "COMPLETED") return true;
  return Boolean(order.closedAt);
}

function readScheduledAtMs(order: Square.Order): number {
  for (const fulfillment of order.fulfillments ?? []) {
    const pickupAt = fulfillment.pickupDetails?.pickupAt;
    if (pickupAt) {
      const parsed = Date.parse(pickupAt);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return Date.parse(order.createdAt ?? "") || 0;
}

function toRawPortalOrder(
  order: Square.Order,
  channel: PortalChannel
): RawPortalOrder {
  const fulfillment = order.fulfillments?.[0];
  const recipient = fulfillment?.pickupDetails?.recipient;
  const note = fulfillment?.pickupDetails?.note ?? null;

  return {
    id: order.id ?? "",
    referenceId: order.referenceId ?? "",
    channel,
    scheduledAtMs: readScheduledAtMs(order),
    createdAtMs: Date.parse(order.createdAt ?? "") || 0,
    isPaid: (order.tenders?.length ?? 0) > 0,
    // Catering "delivery" is still a PICKUP fulfillment - the distinction
    // lives in the note (see buildFulfillment in src/lib/checkout/build-order.ts).
    isDelivery: Boolean(note?.includes("CATERING DELIVERY")),
    state: order.state ?? "OPEN",
    totalCents: toCents(order.totalMoney),
    tipCents: toCents(order.totalTipMoney),
    customerName: recipient?.displayName?.trim() || "—",
    customerPhone: recipient?.phoneNumber?.trim() || "—",
    note,
    deliveryAddress: extractNoteSegment(note, "CATERING DELIVERY (restaurant-arranged) to: "),
    deliveryDistanceLabel: order.metadata?.cateringDeliveryDistance?.trim() || null,
    specialInstructions: extractNoteSegment(note, "Special instructions: ") || "—",
    items: (order.lineItems ?? []).map((lineItem) => ({
      name: lineItem.name?.trim() || "Item",
      quantity: Number.parseInt(lineItem.quantity ?? "0", 10) || 0,
      totalLabel: formatMoney(toCents(lineItem.totalMoney)),
    })),
  };
}

async function scanSquareOrders(): Promise<RawPortalOrderResult> {
  const client = getSquareClient();
  const locationId = getSquareLocationId();
  const lookbackDays = getOrderLookbackDays();
  const startAt = new Date(
    Date.now() - lookbackDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const baseRequest = {
    locationIds: [locationId],
    limit: PAGE_LIMIT,
    query: {
      filter: {
        dateTimeFilter: { createdAt: { startAt } },
        // Server-side allowlist. Without this the endpoint returns every order
        // at the location - measured at 17,369 orders / 35 pages / ~39s for a
        // 90-day window - of which only a handful are ours. Square ANDs this
        // with the date filter, so POS, DoorDash, UberEats, Grubhub and Square
        // Online orders never leave Square's servers.
        sourceFilter: { sourceNames: getPortalSourceNames() },
      },
      sort: { sortField: "CREATED_AT", sortOrder: "DESC" },
    },
  } satisfies Square.SearchOrdersRequest;

  const scanned: Square.Order[] = [];
  let cursor: string | undefined;
  let pages = 0;

  do {
    const response = await client.orders.search({ ...baseRequest, cursor });
    scanned.push(...(response.orders ?? []));
    cursor = response.cursor;
    pages += 1;
  } while (cursor && pages < MAX_PAGES);

  const orders: RawPortalOrder[] = [];
  const skippedUnsettledByChannel: Record<PortalChannel, number> = {
    "order-online": 0,
    catering: 0,
  };
  let unclassified = 0;

  for (const order of scanned) {
    if (order.state === "CANCELED") continue;

    // The source filter has already established this order is ours, so a
    // missing channel does not mean "not ours" - it means an untagged order of
    // ours. Count those rather than guessing a channel (which could misfile an
    // order onto the wrong page) or dropping them silently.
    const channel = readChannel(order);
    if (!channel) {
      unclassified += 1;
      continue;
    }

    if (!isSettled(order)) {
      skippedUnsettledByChannel[channel] += 1;
      continue;
    }

    orders.push(toRawPortalOrder(order, channel));
  }

  return {
    orders,
    skippedUnsettledByChannel,
    unclassified,
    scannedOrders: scanned.length,
  };
}

/**
 * Brief per-instance cache. Loading the dashboard twice in a minute should not
 * mean scanning Square twice. On serverless this is per-instance and evaporates
 * on cold start - it is a latency optimisation, never a correctness guarantee.
 */
let cache: { at: number; value: RawPortalOrderResult } | undefined;

async function listRawPortalOrders(): Promise<RawPortalOrderResult> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.value;

  const value = await scanSquareOrders();
  cache = { at: now, value };
  return value;
}

function toView(order: RawPortalOrder): AdminOrderView {
  return {
    id: order.id,
    referenceId: order.referenceId,
    channel: order.channel,
    scheduledLabel: formatPacific(order.scheduledAtMs),
    createdLabel: formatPacific(order.createdAtMs),
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    fulfilmentLabel: order.isDelivery ? "Catering delivery" : "Pickup",
    isPaid: order.isPaid,
    stateLabel: STATE_LABELS[order.state] ?? order.state,
    totalLabel: formatMoney(order.totalCents),
    tipLabel: order.tipCents > 0 ? formatMoney(order.tipCents) : null,
    items: order.items,
    note: order.note,
    deliveryAddress: order.deliveryAddress,
    deliveryDistanceLabel: order.deliveryDistanceLabel,
    specialInstructions: order.specialInstructions,
  };
}

/**
 * Returns one portal flow's orders, split by whether the event/pickup time has
 * passed. The split is a plain instant comparison - "Pacific" only governs how
 * the times are *displayed*, which formatPacific handles.
 *
 * Upcoming sorts soonest-first (what needs cooking next) and completed sorts
 * most-recent-first (what just happened).
 */
export async function getPortalOrderSummary(
  channel: PortalChannel
): Promise<PortalOrderSummary> {
  const { orders, skippedUnsettledByChannel, unclassified, scannedOrders } =
    await listRawPortalOrders();

  const now = Date.now();
  const forChannel = orders.filter((order) => order.channel === channel);

  const upcoming = forChannel
    .filter((order) => order.scheduledAtMs > now)
    .sort((a, b) => a.scheduledAtMs - b.scheduledAtMs);

  const completed = forChannel
    .filter((order) => order.scheduledAtMs <= now)
    .sort((a, b) => b.scheduledAtMs - a.scheduledAtMs);

  return {
    upcoming: upcoming.map(toView),
    completed: completed.map(toView),
    skippedUnsettled: skippedUnsettledByChannel[channel],
    unclassified,
    lookbackDays: getOrderLookbackDays(),
    scannedOrders,
  };
}
