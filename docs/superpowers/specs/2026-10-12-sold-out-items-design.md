# Sold-out items — design

## Goal

When the restaurant runs out of a dish, staff can mark it (or a whole menu
group) sold out from the admin. The website then shows it as sold out and
refuses to order it. Today nothing on the site knows about sold-out items, and
checkout does not re-check the menu, so a customer can order food that is gone.

Success looks like: staff mark an item sold out in under 10 seconds; customers
see it greyed out within about a minute; an old cart or hand-crafted request
cannot order it.

## Decisions (agreed)

- **Own storage, not Square.** Square lets a seller mark a variation sold out,
  but applications cannot set that flag (`ItemVariationLocationOverrides.soldOut`
  — "attempts by an application to set this attribute are ignored"). State is
  therefore kept in our Neon database.
- **Duration is chosen per toggle:** *Today only* (clears itself at midnight
  Pacific) or *Until restored*. Default offered first is Today only.
- **Scope:** per menu ("Menu" or "Catering"), at **group** or **item** level.
  Each menu has its own Square objects, so the two menus are independent.
- **Display:** sold-out items stay visible, greyed, with a "Sold out" badge and
  no add-to-cart. A sold-out group shows a "Currently sold out" banner.
- **Failure mode:** if the database cannot be read, the menu renders normally
  and checkout proceeds; the error is logged. Blocking all orders on a database
  blip is worse than a rare sold-out order getting through.

Out of scope: honoring Square's own POS sold-out flag, per-variation sold-out
(e.g. only "Family Pack"), and any history/audit log.

## Data

New table `sold_out_items`, created automatically on first use like the
existing tables (`src/lib/db.ts`, `src/lib/newsletter/subscribers.ts`):

| Column | Type | Meaning |
| --- | --- | --- |
| `square_id` | text, primary key | Square catalog id of the group or item |
| `kind` | text (`group` \| `item`) | What `square_id` refers to |
| `menu_name` | text | "Menu" or "Catering" (display only) |
| `label` | text | Name when it was marked, so the admin can list it |
| `expires_at` | timestamptz, nullable | Expiry; null means until restored |
| `created_at` | timestamptz | When it was marked |

An entry is **active** when `expires_at` is null or `expires_at > now`. Expired rows are
ignored on read; there is no cleanup job. Marking an already-marked id
replaces its row (changing duration). Marking a group sold out covers every
item in that group, including items added to it later.

"Midnight Pacific" is computed with the existing `America/Los_Angeles`
helpers in `src/lib/time-slots.ts`.

## Modules

- `src/lib/sold-out/store.ts` — table creation, `markSoldOut`, `restore`,
  `listActive`. Server-only; the only code that touches the table.
- `src/lib/sold-out/logic.ts` — pure functions with no I/O: `isActive(entry,
  now)`, `midnightPacific(now)`, `applySoldOut(menu, activeEntries)` (returns
  the menu with `soldOut` flags set on items and sections), and
  `soldOutLines(lines, menu, activeEntries)` for checkout. Pure so it is
  testable without a database.
- `src/lib/sold-out/read.ts` — `getActiveSoldOut()` wraps `listActive` in
  `unstable_cache` (about 30 s, tagged `sold-out`) and applies the fail-open
  rule.
- `src/app/admin/(dashboard)/sold-out/page.tsx` plus a server actions file —
  the admin screen. Actions re-verify the admin session and then call
  `revalidateTag("sold-out", { expire: 0 })` and revalidate `/order-online`
  and `/catering`.
- Changes to `src/lib/square/menu.ts` types (`MenuItemView.soldOut`,
  `MenuSectionView.soldOut`), `src/components/menu-page.tsx` and
  `menu-sections.tsx` (render and block add-to-cart), and
  `src/app/api/checkout/order-online/route.ts` and `.../catering/route.ts`.

The Square menu structure keeps its existing hourly cache. Sold-out state is
overlaid per request from the short-lived cache, so it never waits on the
hourly window.

## Admin screen

- New hub card **Sold Out** on `/admin`, linking to `/admin/sold-out`.
- Menu switcher **Menu | Catering** (`?menu=catering`), server-rendered, same
  look as the orders tabs.
- Groups listed, each expandable to its items.
- Each row shows a status. **Available** rows offer *Sold out today* and
  *Sold out until I restore*. **Sold out** rows show a chip ("today" /
  "until restored") and a **Restore** button.
- Items inside a sold-out group show "Sold out (group)" with their own buttons
  disabled; restoring the group brings them back.
- Plain form actions, no client JavaScript. If the Square menu cannot be
  loaded the page shows the same notice the orders pages use.

## Website and checkout

- `getMenuByName` result is overlaid with `getActiveSoldOut()` in
  `menu-page.tsx`; items and sections carry `soldOut`.
- A sold-out item renders greyed with a "Sold out" badge, is not clickable, and
  cannot be added to the cart.
- Both checkout endpoints, after their existing checks, load the menu
  structure (cached) and the active sold-out list, resolve each cart line's
  `variationId` to its item and group, and reject with a 400 naming the items:
  "X is sold out — please remove it from your cart." The existing cart error UI
  already displays endpoint errors.
- Freshness target: a toggle is visible within seconds (explicit
  revalidation); a "today only" expiry within about a minute of midnight
  (cache window).

## Error handling

- Database unreadable: log, treat as nothing sold out (fail open) on the menu
  and at checkout.
- Database write fails in the admin: the action returns to the page with an
  error message; nothing is silently dropped.
- Unknown `square_id` submitted to an action (stale page after the catalog
  changed): rejected with a clear message rather than stored.
- Cart line whose variation is no longer in the menu: left to the existing
  Square order creation to reject, as today.

## Testing

Node's built-in runner (`node --test`, type stripping on Node 24), no new
dependencies. Unit tests on `logic.ts`: active vs expired vs no-expiry;
midnight-Pacific boundary including a daylight-saving date; group covers its
items; item-only entry covers only that item; checkout line resolution by
variation id; empty list leaves the menu untouched. The store and the pages
are verified manually against the dev server with a real database.

## Open verification items for the plan

- Whether `/order-online` and `/catering` are statically cached routes; if so,
  `revalidatePath` is required in addition to the tag (the plan will confirm
  against the Next 16 docs in `node_modules/next/dist/docs/`).
- Cart UI wording when checkout returns the sold-out error.
