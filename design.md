# Menu loading strategy

## Problem

`/order-online` and `/catering` each render a Square Menu (~150 items across
12 categories). The original implementation re-ran the full paginated Square
Catalog read (categories, items, images) on every single page view. That's
several sequential/parallel network round-trips to Square on every request,
which made navigating to either page feel slow - clicking "Order Online" in
the navbar could sit for a few seconds with no feedback before anything
appeared.

## Options considered

**A. Lazy-load each category from the network on demand** (fetch only "Veg
Appetizers" when that tab is clicked, hit Square again for the next tab).
Rejected - the dataset is small (~150 items of text + one thumbnail each),
so this trades one slow load for ~12 smaller ones, adds a loading state per
tab, and hides menu content from anything that doesn't run the client JS
(crawlers, SEO, no-JS fallback). It doesn't fix the underlying cost either:
Square still gets hit on every visit, just spread across more requests.

**B. Cache the Square read server-side + client-side category tabs over the
already-fetched data.** Chosen. The restaurant edits the Square catalog
infrequently, which is exactly the case caching is for: fetch once, serve
many times, and only pay Square's latency again when the cache actually
expires or someone explicitly asks for a refresh.

## What's implemented

### 1. Server-side caching (`src/lib/square/menu.ts`)

`getMenuByName` is wrapped in Next's `unstable_cache`:

```ts
export const getMenuByName = unstable_cache(fetchMenuByName, ["square-menu-by-name"], {
  revalidate: SQUARE_MENU_REVALIDATE_SECONDS, // 3600s / 1 hour
  tags: [SQUARE_MENU_CACHE_TAG], // "square-menu"
});
```

This still reads the menu *structure* live from Square by name every time the
underlying fetch actually runs (no hardcoded category/item ids - see the
gotchas in the original build prompt) - what's cached is the *result* of that
read, not the ids themselves. Both `getMenuByName("Menu")` and
`getMenuByName("Catering-BB")` are cached independently (the menu name is
part of `unstable_cache`'s automatic argument-based cache key).

Measured effect in dev: first request after a cold cache ~1.5s (real Square
round-trip), every request after that ~50-65ms (served from Next's Data
Cache) - about 20-25x faster. On Vercel this uses their Data Cache, which
works the same way in production.

### 2. On-demand revalidation (`src/app/api/revalidate-menu/route.ts`)

Since the menu changes infrequently but not never, waiting up to an hour
after editing Square isn't great. Hitting:

```
GET /api/revalidate-menu?secret=<REVALIDATE_SECRET>
```

busts the cache immediately (`revalidateTag(tag, { expire: 0 })` - the
`{ expire: 0 }` form because this is called from outside a Server Action, so
Next's `updateTag` isn't available here; see Next.js 16's `revalidateTag`
docs). `REVALIDATE_SECRET` lives in `.env` / `.env.sandbox` / `.env.local`
(gitignored) - **this also needs to be added to the Vercel project's
environment variables** before deploying, or the route always 500s.

Practical use: after editing the catalog in Square, open that URL once
(bookmark it) instead of waiting for the hourly window.

### 3. Category tabs (`src/components/menu-sections.tsx`)

A small client component renders one pill button per Menu Group (all 12) and
only mounts the *active* section's item cards - the other 11 sections' cards,
and critically their images, never enter the DOM until that tab is clicked.
Switching tabs is pure client-side state (no network request), so it's
instant. This is on top of the caching above, not a replacement for it: caching
fixes the slow *data fetch*, tabs reduce the amount of *DOM/images* painted
and requested on first load.

Both `/order-online` and `/catering` share this component and its styling
(`src/components/menu-page.css`), since the only difference between the two
pages is the menu name and header copy (`src/components/menu-page.tsx`).

### 4. Loading skeletons (`src/app/order-online/loading.tsx`,
`src/app/catering/loading.tsx`)

Next's `loading.tsx` file convention shows a themed skeleton (tab-row +
card-grid shimmer) immediately on navigation while the Server Component
fetches. With caching in place this mostly only matters on a cold cache, but
it means a click never looks unresponsive even then.

## Why not `cacheComponents` / `"use cache"`

Next.js 16 ships a newer caching model (`cacheComponents` flag, `"use cache"`
directive, `cacheLife`/`cacheTag`) and its own docs mark `unstable_cache` as
"replaced by `use cache`". Deliberately not adopted here: `cacheComponents`
also turns on Partial Prerendering and changes client-side navigation
behavior (React `<Activity>`-based route caching) project-wide - a much
bigger behavioral change than "cache one data fetch," and this project's
Next version is already bleeding-edge enough to warrant caution (see
`AGENTS.md`). `unstable_cache` is still fully documented as the supported
approach for projects not using Cache Components. Worth revisiting if/when
this project adopts Cache Components for other reasons.

## Deploying to Vercel

- Add `REVALIDATE_SECRET` (and the existing `SQUARE_ACCESS_TOKEN`,
  `SQUARE_ENVIRONMENT`, `SQUARE_LOCATION_ID`) to the Vercel project's
  Environment Variables before deploying.
- No extra Vercel config needed for the caching itself - `unstable_cache`
  uses Vercel's Data Cache automatically on that platform.

---

# Checkout: two separate carts, Orders API, Checkout API

## Why two separate carts, not one

Order Online (the "Menu" catalog) and Catering (the "Catering-BB" catalog)
are different Square catalogs with different item ids and pricing even for
identically-named dishes (confirmed empirically against production - e.g.
"Butter Naan" exists as 3 distinct `ITEM` ids across the account's
categories). The restaurant asked for these kept as fully separate
carts/checkouts rather than one cart grouped by source, because:

- Catering orders need very different fulfillment rules (advance notice,
  delivery handled by staff, not Square's courier) - mixing them with
  same-day Order Online items in one checkout doesn't make sense.
- It sidesteps "what happens if someone adds both" entirely - there's no
  code path where that's even possible, rather than a runtime guard.

Implementation: `src/lib/cart/cart-context.tsx` exports a
`createCartStore(storageKey, defaultSource)` factory, instantiated twice -
`OrderOnlineCartProvider`/`useOrderOnlineCart` (localStorage key
`bommarillu-cart-order-online-v1`) and `CateringCartProvider`/
`useCateringCart` (`bommarillu-cart-catering-v1`). Both wrap the whole app in
`layout.tsx`; `MenuItemModal` picks which one to write to based on the
`source` prop passed down from each page. The navbar cart icon only reads
the Order Online store. The Catering cart has no dedicated route - it's a
sticky bar + drawer (`src/components/catering-cart-panel.tsx`) rendered
directly on `/catering`, per the restaurant's request to keep it "in the
catering page itself."

## Where customer/fulfillment info goes (researched against Square's docs)

Square's `Order.fulfillments[]` (max one fulfillment per order created via
the API) carries this, not the payment itself:

- **PICKUP** (`pickup_details`): needs `recipient.display_name` and
  `pickup_at` (a real timestamp, not a string description). Square's hosted
  checkout page has its own "Contact" section that collects email/phone and
  attaches them to the order automatically after payment - so those aren't
  collected on our own form, only **name** and **phone** are (phone
  collected redundantly on our side too, since `FulfillmentRecipient`'s own
  doc comments mark it required, which conflicted with a separate Square
  guide page that only called out `display_name` as strictly required for
  pickup - collecting it ourselves avoids depending on which of those two
  is actually authoritative).
- **DELIVERY (`delivery_details`) is not used at all.** Researched against
  Square's docs and Square-staff answers (2026): Square's managed courier
  dispatch (DoorDash / Uber Eats / Nash) only runs inside Square's own
  hosted ordering surfaces - creating a `DELIVERY` fulfillment through the
  Orders API never dispatches a courier, and the fulfillment type itself is
  gated to partner apps (an unenrolled app gets HTTP 200 but the order is
  invisible to the seller in Order Manager/POS). So **Order Online "delivery"
  is not offered on this site**: customers who want delivery are redirected
  to the restaurant's online ordering profile (the `cash.app` storefront
  Square builds automatically from the catalog; `src/lib/delivery.ts`),
  where dispatch actually works. Order Online on this site is pickup-only.
- **Catering "delivery" also stays `type: "PICKUP"`.** Delivery for catering
  orders is arranged by staff directly (orders are too large for courier
  partners), and API-created `DELIVERY` fulfillments would not dispatch a
  courier anyway (see above). A catering order with delivery chosen gets
  `type: "PICKUP"` in Square, with the delivery address attached to
  `pickup_details.recipient.address` (a structured field staff can see)
  *and* spelled out in `pickup_details.note` (free text) as
  "CATERING DELIVERY (restaurant-arranged) to: ..." - "as required"
  (structured) and "as text" (note), per what was asked for.
- Built in `src/lib/checkout/build-order.ts` (`buildFulfillment`).

## Money: never trust the client

Line items sent to Square reference only `catalogObjectId` (the real
`ITEM_VARIATION`/`MODIFIER` id) and `quantity` - never a client-supplied
price. This is Square's own explicit guidance ("Square Order Checkout"
guide): catalog-referenced line items inherit the live catalog price
automatically, so a customer tampering with the cart's `priceCents` in
their browser before checkout can't change what Square actually charges.
The cart's stored prices are only ever used to *display* a running total
before checkout.

## The Pacific-time bug, and how it's actually fixed

`src/lib/time-slots.ts` is the only place time gets constructed. Every
conversion goes through `date-fns-tz`'s `fromZonedTime`/`formatInTimeZone`
against the fixed IANA zone `America/Los_Angeles` - never the browser's or
server's ambient local time (Vercel functions run in UTC; a customer's
browser could be in any timezone). Verified against both DST sides:
4:00 PM PDT (summer) → `23:00:00Z`, 4:00 PM PST (winter) →
`00:00:00Z` next day, both correct, plus a round-trip format check.

The Route Handlers re-derive the UTC instant from the submitted date/slot
themselves and reject anything that's no longer far enough in the future
(defense in depth - never trust the client's own lead-time filtering, a
slot chosen minutes ago could already be stale by the time the request
lands).

Lead times (adjustable, currently): Order Online pickup 20 minutes,
Catering 24 hours. Business hours used for the slot list: 11:55 AM-10:44 PM
(from the site footer), 30-minute increments. Both are enforced only by
this site's server code (`src/lib/time-slots.ts` + the checkout route
handlers) - Square's own dashboard lead-time/timing settings only govern its
hosted ordering surfaces and do not gate Orders API orders, which Square
accepts for any future `pickup_at` (it only rejects times in the past).

## Order creation flow (`src/lib/checkout/build-order.ts`)

Two calls, not one:

1. `client.orders.create({ order, idempotencyKey })` - order already has
   `lineItems` and the single `fulfillments[]` entry fully built.
2. `client.checkout.paymentLinks.create({ order: { id, locationId, version }, checkoutOptions: { redirectUrl }, idempotencyKey })` -
   referencing the just-created order by id rather than embedding a new one.

This was chosen over the simpler, more clearly-documented one-call version
(embed a brand new `Order` object directly in `paymentLinks.create`) so the
real `order.id` is known *before* building `redirectUrl`, letting the
confirmation page look up the exact order without any ambiguity.

Every order also carries order-level `metadata: { channel: "order-online" |
"catering" }` (set by whichever checkout route called `createCheckout`), so
staff can tell the two flows apart in the Square Dashboard without parsing
the fulfillment note - the note stays human-readable prose. `reference_id`
remains an opaque per-order UUID.

**Caveat, since this wasn't live-tested end-to-end (see below):** passing
`order: { id, locationId, version }` to reference an already-created order
in `paymentLinks.create` is a reasonable, standard inference from the SDK's
types and Square's general "partial object with id+version = reference an
existing resource" pattern, but I could not find it explicitly confirmed in
Square's docs, and couldn't verify it live without creating a real order in
the production account. **Safety net if it doesn't behave as expected:**
Square's hosted checkout is independently confirmed (developer forum
threads) to append `?orderId=...&checkoutId=...&transactionId=...` to
`redirectUrl` automatically after a real payment completes - since this
project's `redirectUrl` already embeds the order id itself
(`?orderId=<id>`), Square appending its own `orderId=` alongside it is
harmless (`URLSearchParams.get` returns the first match, which is ours, and
both should be the same value in the working case anyway).

## Confirmation page (`src/app/order-confirmation/page.tsx`)

Square redirects here after checkout *regardless of whether payment
actually succeeded* - looks the order up via `client.orders.get` and shows
paid / still-processing / not-found based on the real order state
(`netAmountDueMoney` + `tenders`), rather than assuming success because the
browser landed on this URL.

## Not yet live-tested

Everything up to (not including) the actual Square Orders/Checkout API call
was verified live in dev against the real production catalog: both carts'
independence, the checkout forms (slot lists, DST-correct times, delivery
address reveal, event-date minimum), and the confirmation page's graceful
handling with no `orderId`. The `createCheckout` call itself (which writes
a real order to the production Square account) was deliberately left for
the restaurant to test themselves rather than creating a real order without
being asked to.
