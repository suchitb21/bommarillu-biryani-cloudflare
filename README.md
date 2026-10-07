# Bommarillu Biryani

Website and internal admin dashboard for **Bommarillu Biryani** —
17020 Avondale Way, Redmond, WA 98052 · +1 425-420-0160.

Square is the system of record for the menu, orders, and payments. A small
Neon Postgres database holds what Square does not: contact messages and
newsletter signups.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind v4 plus hand-written CSS per feature |
| Commerce | Square Catalog, Orders, and Checkout APIs (`square` SDK 45) |
| Database | Neon Postgres via `@neondatabase/serverless` (HTTP driver) |
| Hosting | Vercel, with Web Analytics and Speed Insights |
| Admin auth | Shared password plus a signed session cookie |

## Local setup

```bash
npm install
cp .env.example .env.local     # then fill in the values
npm run dev
```

Site: <http://localhost:3000> · Admin: <http://localhost:3000/admin>

## Environment variables

All of these belong in `.env.local` locally **and** in the Vercel project's
environment variables. Vercel only picks up new values on a fresh build, so
redeploy after changing any of them.

### Required for the public site

| Variable | Notes |
| --- | --- |
| `SQUARE_ACCESS_TOKEN` | Production or sandbox access token |
| `SQUARE_ENVIRONMENT` | `production` or `sandbox` |
| `SQUARE_LOCATION_ID` | The Redmond location |
| `REVALIDATE_SECRET` | Any random string; guards `/api/revalidate-menu` |

### Required for the contact form, newsletter, and admin lists

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | **Pooled** connection string from the Neon console |

### Required for the admin dashboard

| Variable | How to produce it |
| --- | --- |
| `ADMIN_PASSWORD_HASH` | `node scripts/hash-admin-password.mjs 'your-password'` |
| `SESSION_SECRET` | `openssl rand -base64 48` (32 characters minimum) |

### Optional

| Variable | Default | Notes |
| --- | --- | --- |
| `SQUARE_PORTAL_SOURCE_NAME` | `Biryani Catering,BOMMARILLU BIRYANI  425-420-0160` | The Square *application* name(s) our orders carry, comma-separated. Keep every past name in the list. See [Identifying our orders](#identifying-our-orders). |
| `ADMIN_ORDER_LOOKBACK_DAYS` | `365` | How far back the dashboard scans, capped at 365 |

> **Careful with `$` in `.env` files.** Next.js expands `$NAME` references when
> it parses `.env.local`, so a value containing `$` can be silently truncated.
> This is why `ADMIN_PASSWORD_HASH` uses `:` separators rather than `$`.

## Routes

**Public pages** — `/`, `/about-us`, `/order-online`, `/catering`, `/cart`,
`/order-confirmation`, `/contact`, `/privacy`, `/terms`

**API** — `/api/checkout/order-online`, `/api/checkout/catering`,
`/api/contact`, `/api/newsletter`, `/api/revalidate-menu`,
`/api/square/health`, `/api/admin/login`, `/api/admin/logout`

**Admin** — `/admin` (hub), `/admin/orders`, `/admin/catering`,
`/admin/messages`, `/admin/newsletters`, `/admin/login`

**Redirects** (`next.config.ts`, all permanent) — the old Square-hosted site's
URLs are redirected so its search listings transfer instead of 404ing:

| Old URL | Goes to |
| --- | --- |
| `/home` | `/` |
| `/product/*` (old dish pages) | `/order-online` |
| `/s/order` | `/order-online` |
| `/?item=…`, `/?si=…` (Square item deep links) | `/order-online` |

Dish pages have no equivalent here, so the menu is the closest destination.
The 404 page is `noindex` and declares no canonical (it must not claim to
duplicate `/`).

## Identifying our orders

This is the least obvious part of the codebase, and the part most likely to
break quietly. The admin dashboard shows **only orders placed through this
website** — never Square POS, DoorDash, Uber Eats, Grubhub, or Square Online.

Two independent markers are used, and they answer different questions:

**1. `order.source.name` — is this order ours?**
Square sets this to the **application name** on orders an app creates. This
app has been renamed once in the Square Developer Portal, so two names are
both "ours": the original `Biryani Catering` and the current
`BOMMARILLU BIRYANI  425-420-0160` (note the double space before the phone
number — that's the real string Square sends, verified with
`scripts/verify-square-sources.sh`, not a typo). Every other channel reports
its own distinct value (`Point of Sale`, `DoorDash`, `UberEats`, `Grubhub`,
`Square Online`), so the dashboard passes both of ours to Square as a
`source_filter` allowlist (`SQUARE_PORTAL_SOURCE_NAME`, comma-separated — see
`src/lib/square/config.ts`) and those other-channel orders never leave
Square's servers. If the app is ever renamed again, **add** the new name to
that list rather than replacing the old one — orders already placed under a
past name are real and would otherwise silently disappear from the dashboard.

This is a performance fix, not just tidiness. Filtering in our own code after
fetching meant downloading the entire location's order history:

| | Before | After |
| --- | --- | --- |
| Orders downloaded (90-day window) | 17,369 | **5** |
| Pages | 35 | **1** |
| Square API time | ~39,000 ms | **~455 ms** |
| Page load, uncached | ~39 s | **~1.6 s** |

**2. `order.metadata.channel` — which of our two flows?**
Set by our checkout to `"order-online"` or `"catering"`. Both flows share one
Square application and therefore one source name, so source cannot separate
them.

Square metadata is **private to the application that wrote it**, which makes
this a trustworthy marker: nothing else can have set it. Note that it is *not*
filterable server-side — Square's search supports only state, date, source,
fulfillment, and customer filters.

### Ordering rules applied in the dashboard

- **Unpaid orders are hidden.** Creating a payment link creates the Square
  order immediately, so an abandoned checkout would otherwise appear as a real
  upcoming order and have staff preparing food nobody paid for. Hidden counts
  are shown per page so nothing disappears silently.
- **Cancelled orders are excluded.**
- **Upcoming vs Completed** is decided by the scheduled pickup/event time, not
  by Square's order state. Upcoming sorts soonest-first.
- **All times are formatted server-side in Pacific time** and passed to the
  client pre-formatted, so the browser never re-derives a date and hydration
  cannot disagree with the server.
- Results are cached in-process for 60 seconds.

### Pagination (25 per page)

The tab and page live in the URL, so a refresh or bookmark lands on the same
view, and only one page of orders is sent to the browser.

| View | How it pages | Cost |
| --- | --- | --- |
| Online → **Upcoming**, and all of **Catering** | Numbered (`?tab=…&page=N`). The server scans every order (cached 60 s), sorts, and slices 25. Shows "Page X of Y" and tab counts. | Grows with total orders |
| Online → **Completed** | Cursor-based (`?tab=completed&before=<createdAt>` / `&after=<createdAt>`, plus a display-only `&p=N`). Asks Square for just the 25 needed, newest first, and stops. Shows **← Newer / Older →**. | Constant per page |

Square can only page by cursor, so the completed list cannot jump to "page 7"
or show a total; the tab badge is omitted where the count isn't known. It
orders by when the order was *placed* (pickup orders track pickup time
closely), and ignores whether Square's `endAt` is inclusive by filtering
strictly past the cursor in code. See `getCompletedOnlineOrdersPage` in
`src/lib/square/portal-orders.ts`.

The Upcoming tab still does the full scan. At a few thousand orders it will be
the slow view; bounding it to recent orders is the next step, but needs the
maximum pickup scheduling horizon confirmed first.

> **If the Square application is ever renamed** in the Square Developer Portal,
> `source.name` changes, the allowlist matches nothing, and both order pages go
> quietly empty. Set `SQUARE_PORTAL_SOURCE_NAME` to the new name, or update the
> default in `src/lib/square/config.ts`.

## Database

Two tables, both created automatically on first write — there is no migration
step, so a fresh database or Neon branch works immediately.

| Table | Written by |
| --- | --- |
| `contact_submissions` | The contact form (`/api/contact`) |
| `newsletter_subscribers` | The newsletter card (`/api/newsletter`) |

`newsletter_subscribers` has a case-insensitive unique index on `lower(email)`,
so signing up twice is a no-op rather than an error.

## Admin authentication

A single shared password protects the dashboard. Everything is stateless.

- The password is stored only as a **scrypt hash** (`ADMIN_PASSWORD_HASH`);
  there is no way to recover a forgotten password — regenerate it.
- Sessions are HMAC-signed tokens in an `httpOnly`, `SameSite=Lax` cookie,
  `Secure` and `__Host-` prefixed in production, valid for **30 days**.
- The token is bound to the current password hash, so **changing
  `ADMIN_PASSWORD_HASH` invalidates every existing session** immediately.
- The gate is enforced in `src/proxy.ts` (Next 16's renamed middleware) **and**
  re-checked in the dashboard layout, because a matcher should never be the
  only thing in front of customer data.
- Login attempts are throttled to 5 per 15 minutes. This is in-memory and
  therefore best-effort on serverless.

## Scripts

| Script | Purpose |
| --- | --- |
| `scripts/hash-admin-password.mjs` | Generates `ADMIN_PASSWORD_HASH` |
| `scripts/verify-square-sources.sh` | Audits which `source.name` values exist in the account, whether `source_filter` works, and whether long date ranges are accepted. Read-only. |
| `scripts/compare-portal-fetch.mjs` | Before/after check that the source filter returns the same portal orders while downloading far fewer. Read-only. |

The two read-only diagnostics take credentials from the environment and print
no customer names, phones, or addresses:

```bash
export SQUARE_ACCESS_TOKEN='...'
export SQUARE_LOCATION_ID='...'
bash scripts/verify-square-sources.sh
```

## Deployment

Deployed on Vercel. The apex domain currently serves a separate Weebly site;
`admin.bommarillubiryani.com` does not exist yet. To point a hostname at this
app, add a `CNAME` in GoDaddy DNS — Vercel provisions the certificate.

## Opening hours

`src/lib/time-slots.ts` is the **single source of truth**. It defines
`WEEKLY_OPEN_WINDOWS`, which both gates the times a customer may book and
generates the display strings the contact page and footer render, via
`getWeeklyHours()`.

Do not hardcode hours anywhere else. The contact page used to keep its own copy,
and it had drifted on five of seven days — advertising a 3–4 PM break on days
the kitchen stayed open, and closing times up to 45 minutes earlier than the
timetable allowed. Editing `WEEKLY_OPEN_WINDOWS` now updates every surface at
once.

## Day-based availability

Some menu groups only apply on certain days. These are matched by Square
category name (case-insensitive), in `src/lib/square/config.ts`:

- `WEEKEND_ONLY_CATEGORY_NAMES` — Friday–Sunday only (e.g. `WEEKEND BIRYANI`).
- `WEEKDAY_ONLY_CATEGORY_NAMES` — Monday–Thursday only: `Chinese Fast Food (week days only)`.

The name must match the Square category exactly, including punctuation. A
renamed category silently stops being restricted.

What each place does:

- **Order Online menu** (`src/components/menu-sections.tsx`) hides groups that
  don't apply to today's Pacific date. Groups stay in the menu data, so the
  cache is unaffected.
- **Order Online checkout** (`src/components/checkout-form.tsx` and
  `src/app/api/checkout/order-online/route.ts`) blocks the order if it contains
  a weekday-only item on a weekend, or a weekend-only item on a weekday. The
  message names the items. Order Online has no date picker, so the customer
  has to come back another day or remove the item.
- **Catering checkout** keeps weekend-only items restricted to a Friday–Sunday
  event date, and names the items in the date note. Weekday-only items are
  not restricted in Catering yet.

Hiding a group in Square's dashboard does **not** apply these rules to the
custom site. See the Delivery section for what Square's own storefront does.

## Catering delivery rules

Catering delivery is staff-arranged. The rules are judged against the **event
date and time**, not when the order is placed, and are enforced in the form
and again on the server (`src/lib/time-slots.ts`):

- **Monday–Friday only.** Saturday and Sunday event dates cannot use delivery.
- **Friday deliveries end at 4:00 PM Pacific.** Friday event times after that
  are removed from the time list when delivery is selected.
- The Delivery button is greyed out on Saturday and Sunday, with a note that
  explains the rule.

The distance band is written to the Square order's metadata
(`cateringDeliveryDistance`), and the delivery address and special instructions
are stored in the order note. The admin catering page shows all three. Orders
placed before this was captured have no distance on record.

## Delivery (the Cash App ordering profile)

The site does not fulfil Order Online delivery itself. Square's courier dispatch
only runs on Square's own ordering pages, so delivery links go to the Square
online ordering profile (`DELIVERY_ORDERING_URL` in `src/lib/delivery.ts`):

    https://cash.app/$bommarilluindiancuis/delivery

Square builds that page from the catalog. Manage it in the Square Dashboard
under **Online → Ordering profile**:

- **Ordering toggle** pauses or resumes orders. While paused, the delivery link
  stops working.
- **Cashtag** changes the URL. Changing it breaks the link in `delivery.ts`
  until that file is updated.
- **Delivery settings** (including On-Demand Delivery) live under the profile's
  Settings.
- **Menu visibility** for that page follows Square's Items → Site Categories
  settings, not this site's day rules.

## Link prefetching

Next.js prefetches every `<Link>` as it scrolls into view, so a nav bar on
every page creates a lot of requests that nobody clicks. The navbar, footer,
and hero CTA therefore use `HoverPrefetchLink`
(`src/components/hover-prefetch-link.tsx`), which prefetches only once the
pointer is over the link. Use it for any new link in a global component. Plain `Link` is still
fine for ordinary page content.

## Further reading

- `design.md` — why the Square menu is cached the way it is
- `AGENTS.md` — Next.js 16 agent rules (regenerated by `next dev`)
