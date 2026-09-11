import "server-only";
import type { Square } from "square";
import { getSquareClient, getSquareLocationId } from "@/lib/square/client";
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
 * Square is the system of record, so there is no local orders table yet -
 * Phase 2 replaces this scan with a Postgres mirror fed by webhooks. Until
 * then the cost of a live read is bounded by only scanning back over a
 * configured window and caching the result briefly.
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
  items: AdminOrderItemView[];
};

type RawPortalOrderResult = {
  orders: RawPortalOrder[];
  skippedUnsettled: number;
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

function fulfillmentNote(order: Square.Order): string {
  return (order.fulfillments ?? [])
    .map((fulfillment) => fulfillment.pickupDetails?.note ?? "")
    .join(" ");
}

/**
 * Decides whether an order came from this website, and from which flow.
 *
 * `metadata.channel` is the structured marker every checkout writes. Orders
 * created before that field existed (see the history of build-order.ts) carry
 * only the prose note, so the note is checked as a fallback. A Square
 * Dashboard order has neither, which is exactly what keeps those out.
 */
function readChannel(order: Square.Order): PortalChannel | null {
  const metadataChannel = order.metadata?.channel;
  if (metadataChannel === "order-online" || metadataChannel === "catering") {
    return metadataChannel;
  }

  const note = fulfillmentNote(order);
  if (note.includes("Catering order")) return "catering";
  if (note.includes("Order Online")) return "order-online";

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
      filter: { dateTimeFilter: { createdAt: { startAt } } },
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
  let skippedUnsettled = 0;

  for (const order of scanned) {
    const channel = readChannel(order);
    if (!channel) continue; // Not from our portal.
    if (order.state === "CANCELED") continue;
    if (!isSettled(order)) {
      skippedUnsettled += 1;
      continue;
    }
    orders.push(toRawPortalOrder(order, channel));
  }

  return { orders, skippedUnsettled, scannedOrders: scanned.length };
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
  const { orders, skippedUnsettled, scannedOrders } =
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
    skippedUnsettled,
    lookbackDays: getOrderLookbackDays(),
    scannedOrders,
  };
}
