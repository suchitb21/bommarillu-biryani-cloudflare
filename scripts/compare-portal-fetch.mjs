#!/usr/bin/env node
/**
 * Before/after comparison for the portal-order fetch. READ ONLY.
 *
 * Proves that adding source_filter:
 *   (a) returns the SAME portal orders as the unfiltered scan, and
 *   (b) fetches far fewer orders to do it.
 *
 * Also dumps every portal order and the unidentified-source orders, so nothing
 * is hidden. Prints no customer names, phones, or addresses.
 *
 * Usage:
 *   SQUARE_ACCESS_TOKEN=... SQUARE_LOCATION_ID=... node scripts/compare-portal-fetch.mjs
 *   ... LOOKBACK_DAYS=120 to widen the window
 */
import { SquareClient, SquareEnvironment } from "square";

const token = process.env.SQUARE_ACCESS_TOKEN;
const locationId = process.env.SQUARE_LOCATION_ID;
const lookbackDays = Number.parseInt(process.env.LOOKBACK_DAYS ?? "90", 10);
const PORTAL_SOURCE_NAME = process.env.SQUARE_PORTAL_SOURCE_NAME ?? "Biryani Catering";
const PAGE_LIMIT = 500;
const MAX_PAGES = 60;

if (!token) { console.error("ERROR: SQUARE_ACCESS_TOKEN not set"); process.exit(1); }
if (!locationId) { console.error("ERROR: SQUARE_LOCATION_ID not set"); process.exit(1); }

const client = new SquareClient({ token, environment: SquareEnvironment.Production });
const startAt = new Date(Date.now() - lookbackDays * 86400000).toISOString();
console.log(`\nlocation : ${locationId}`);
console.log(`window   : last ${lookbackDays} days (created_at >= ${startAt})`);
console.log(`portal   : source.name === ${JSON.stringify(PORTAL_SOURCE_NAME)}\n`);

async function scan({ withSourceFilter }) {
  const filter = { dateTimeFilter: { createdAt: { startAt } } };
  if (withSourceFilter) filter.sourceFilter = { sourceNames: [PORTAL_SOURCE_NAME] };

  const request = {
    locationIds: [locationId],
    limit: PAGE_LIMIT,
    query: {
      filter,
      sort: { sortField: "CREATED_AT", sortOrder: "DESC" },
    },
  };

  const orders = [];
  let cursor;
  let pages = 0;
  const started = Date.now();

  do {
    const response = await client.orders.search({ ...request, cursor });
    orders.push(...(response.orders ?? []));
    cursor = response.cursor;
    pages += 1;
    if (withSourceFilter && orders.length === 0 && !cursor) break;
  } while (cursor && pages < MAX_PAGES);

  return { orders, pages, ms: Date.now() - started };
}

/** What the current (unfiltered) code treats as a portal order. */
function readChannel(order) {
  const meta = order.metadata?.channel;
  if (meta === "order-online" || meta === "catering") return meta;
  const note = (order.fulfillments ?? [])
    .map((f) => f.pickupDetails?.note ?? "")
    .join(" ");
  if (note.includes("Catering order")) return "catering";
  if (note.includes("Order Online")) return "order-online";
  return null;
}

function sourceName(order) {
  const n = order.source?.name;
  return n === undefined || n === null || String(n).trim() === "" ? "<none>" : String(n);
}

function summarize(label, result) {
  const portal = result.orders.filter((o) => readChannel(o) !== null);
  console.log(`--- ${label} ---`);
  console.log(`  pages fetched        : ${result.pages}`);
  console.log(`  orders DOWNLOADED    : ${result.orders.length}`);
  console.log(`  elapsed              : ${result.ms} ms`);
  console.log(`  portal orders found  : ${portal.length}`);
  return portal;
}

const before = await scan({ withSourceFilter: false });
const beforePortal = summarize("BEFORE - no source filter (current code)", before);

const after = await scan({ withSourceFilter: true });
const afterPortal = summarize(`AFTER - source_filter [${PORTAL_SOURCE_NAME}]`, after);

console.log("\n=== AGREEMENT CHECK ===");
const beforeIds = new Set(beforePortal.map((o) => o.id));
const afterIds = new Set(afterPortal.map((o) => o.id));
const missing = [...beforeIds].filter((id) => !afterIds.has(id));
const extra = [...afterIds].filter((id) => !beforeIds.has(id));
console.log(`  only in BEFORE : ${missing.length}${missing.length ? " -> " + missing.join(", ") : ""}`);
console.log(`  only in AFTER  : ${extra.length}${extra.length ? " -> " + extra.join(", ") : ""}`);
console.log(
  `  verdict        : ${
    missing.length === 0 && extra.length === 0
      ? "IDENTICAL portal order sets"
      : "MISMATCH - investigate before shipping"
  }`
);
console.log(
  `  payload cut    : ${before.orders.length} -> ${after.orders.length} orders downloaded ` +
    `(${before.orders.length === 0 ? 0 : Math.round((1 - after.orders.length / before.orders.length) * 100)}% fewer)`
);
console.log(
  `  speed          : ${before.ms} ms -> ${after.ms} ms`
);

console.log("\n=== PORTAL ORDERS (from the unfiltered scan) ===");
for (const o of beforePortal) {
  const channel = readChannel(o);
  const pickup = o.fulfillments?.[0]?.pickupDetails?.pickupAt ?? "(none)";
  const paid = (o.tenders?.length ?? 0) > 0 ? "PAID" : "unpaid";
  console.log(
    `  ${o.id}\n` +
      `    created=${o.createdAt}  state=${o.state}  ${paid}\n` +
      `    channel=${channel}  source=${JSON.stringify(sourceName(o))}\n` +
      `    scheduled(pickupAt)=${pickup}  total=${(Number(o.totalMoney?.amount ?? 0) / 100).toFixed(2)}`
  );
}

const unidentified = before.orders.filter((o) => sourceName(o) === "<none>");
console.log(`\n=== ORDERS WITH NO source.name (${unidentified.length}) - excluded by the allowlist ===`);
for (const o of unidentified) {
  console.log(
    `  ${o.id}  created=${o.createdAt}  state=${o.state}  ` +
      `channel=${readChannel(o) ?? "<none>"}  items=${(o.lineItems ?? []).length}`
  );
}
console.log("\nDone. Nothing was modified.\n");
