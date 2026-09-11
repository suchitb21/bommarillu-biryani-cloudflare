#!/usr/bin/env node
/**
 * STEP 1 DIAGNOSTIC - read only. Changes nothing, writes nothing.
 *
 * Answers: what does `order.source.name` actually contain in THIS account, and
 * what does `metadata.channel` contain? Run this before any filtering logic is
 * written, so the filter is built on observed values rather than assumptions.
 *
 * Usage (keeps the token out of your shell history):
 *
 *   node --env-file=.env.local scripts/verify-square-sources.mjs
 *
 * Optional: LOOKBACK_DAYS=60 node --env-file=.env.local scripts/verify-square-sources.mjs
 *
 * Requires SQUARE_ACCESS_TOKEN, SQUARE_ENVIRONMENT, SQUARE_LOCATION_ID.
 * Prints no customer names, phones, or addresses.
 */
import { SquareClient, SquareEnvironment } from "square";

const token = process.env.SQUARE_ACCESS_TOKEN;
const environment = process.env.SQUARE_ENVIRONMENT;
const locationId = process.env.SQUARE_LOCATION_ID;
const lookbackDays = Number.parseInt(process.env.LOOKBACK_DAYS ?? "30", 10);
const PAGE_LIMIT = 500;
const MAX_PAGES = 40;

function fail(message) {
  console.error(`\n  ERROR: ${message}\n`);
  process.exit(1);
}

if (!token) fail("SQUARE_ACCESS_TOKEN is not set. Use: node --env-file=.env.local scripts/verify-square-sources.mjs");
if (environment !== "production" && environment !== "sandbox") {
  fail(`SQUARE_ENVIRONMENT must be "production" or "sandbox", got "${environment}".`);
}
if (!locationId) fail("SQUARE_LOCATION_ID is not set.");
if (!Number.isFinite(lookbackDays) || lookbackDays <= 0) {
  fail(`LOOKBACK_DAYS must be a positive number, got "${process.env.LOOKBACK_DAYS}".`);
}

const client = new SquareClient({
  token,
  environment:
    environment === "production"
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox,
});

// Deliberately NO source_filter: this run's whole purpose is to discover what
// the unfiltered population looks like.
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
};

console.log(`\nEnvironment : ${environment}`);
console.log(`Location    : ${locationId}`);
console.log(`Window      : last ${lookbackDays} days (created_at >= ${startAt})`);
console.log("Fetching with NO source filter, to observe the real population...\n");

const orders = [];
let cursor;
let pages = 0;

try {
  do {
    const response = await client.orders.search({ ...baseRequest, cursor });
    orders.push(...(response.orders ?? []));
    cursor = response.cursor;
    pages += 1;
    process.stdout.write(`\r  page ${pages} - ${orders.length} orders so far`);
  } while (cursor && pages < MAX_PAGES);
} catch (error) {
  fail(`SearchOrders failed: ${error instanceof Error ? error.message : String(error)}`);
}

console.log(`\n\n=== FETCHED ${orders.length} orders across ${pages} page(s) ${cursor ? "(STOPPED AT PAGE CAP - more exist)" : ""} ===`);

/** Source is often an empty object for POS orders, so distinguish the cases. */
function describeSource(order) {
  if (order.source === undefined || order.source === null) return "<source absent>";
  const name = order.source.name;
  if (name === undefined || name === null) return "<source present, name absent>";
  if (String(name).trim() === "") return "<source present, name empty string>";
  return String(name);
}

const bySource = new Map();
const byChannel = new Map();
const crossTab = new Map();

for (const order of orders) {
  const source = describeSource(order);
  const channel =
    order.metadata && "channel" in order.metadata
      ? `channel=${JSON.stringify(order.metadata.channel)}`
      : "<no metadata.channel>";

  bySource.set(source, (bySource.get(source) ?? 0) + 1);
  byChannel.set(channel, (byChannel.get(channel) ?? 0) + 1);

  const key = `${source}  |  ${channel}`;
  crossTab.set(key, (crossTab.get(key) ?? 0) + 1);
}

function printHistogram(title, map) {
  console.log(`\n=== ${title} ===`);
  const rows = [...map.entries()].sort((a, b) => b[1] - a[1]);
  const width = Math.max(...rows.map(([label]) => label.length), 10);
  for (const [label, count] of rows) {
    console.log(`  ${label.padEnd(width)}  ${String(count).padStart(7)}`);
  }
  if (rows.length === 0) console.log("  (nothing)");
}

printHistogram("order.source.name VALUES", bySource);
printHistogram("order.metadata.channel VALUES", byChannel);
printHistogram("CROSS-TAB: source.name  |  metadata.channel", crossTab);

const realNames = [...bySource.keys()].filter((s) => !s.startsWith("<"));
console.log(`\n=== VERDICT ===`);
if (realNames.length === 0) {
  console.log("  NO order carried a usable source.name.");
  console.log("  => source_filter CANNOT be used as an allowlist in this account.");
  console.log("  => POS and web orders cannot be separated server-side at all.");
} else {
  console.log(`  ${realNames.length} distinct non-empty source.name value(s):`);
  for (const name of realNames) console.log(`    ${JSON.stringify(name)}  (${bySource.get(name)} orders)`);
  console.log("\n  Compare these against:");
  console.log("    - orders you KNOW came from your website (should share one value)");
  console.log("    - orders you KNOW were rung up on Square POS");
  console.log("  If the website value is distinct and POS orders show <source absent>/<name absent>,");
  console.log("  then source_filter with the website value WILL exclude POS server-side.");
  console.log("  If a website name is NOT distinct, source_filter cannot do this job.");
}

console.log(`\n=== SAMPLE (first 10, no customer PII) ===`);
for (const order of orders.slice(0, 10)) {
  const channel = order.metadata?.channel ?? "-";
  console.log(
    `  ${order.id}  ${order.createdAt}  state=${order.state}  ` +
      `source=${JSON.stringify(describeSource(order))}  channel=${JSON.stringify(channel)}  ` +
      `items=${(order.lineItems ?? []).length}`
  );
}

console.log(
  "\nNOTE: metadata entries are private to the Square application that wrote\n" +
    "them, so metadata.channel only appears for orders this app created.\n"
);
