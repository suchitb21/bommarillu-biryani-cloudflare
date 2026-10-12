# Sold-out Items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Staff can mark a menu group or item sold out from the admin; the website greys it out and checkout refuses it.

**Architecture:** A small `sold_out_items` table in Neon holds entries (group or item id, optional expiry). Pure functions in `src/lib/sold-out/logic.ts` overlay the entries on the cached Square menu and resolve cart lines at checkout. A server-rendered admin page with form actions writes the table; the public menu pages and both checkout endpoints read it (fail-open).

**Tech Stack:** Next.js 16.3 (App Router, server actions), React 19, Neon HTTP driver (`@neondatabase/serverless`), `date-fns-tz`, Node's built-in test runner (`node --test`, Node 24 type stripping).

**Spec:** `docs/superpowers/specs/2026-10-12-sold-out-items-design.md`

> Read `AGENTS.md` first: this Next.js has breaking changes. Docs live in `node_modules/next/dist/docs/`.

## Global Constraints

- Sold-out scope is per menu ("Menu" = `SQUARE_MENU_NAMES.onlineOrdering`, "Catering" = `SQUARE_MENU_NAMES.catering`), at **group** or **item** level only. No per-variation sold-out.
- Duration is `today` (expires at the next midnight in `America/Los_Angeles`) or `until-restored` (no expiry).
- An entry is **active** when `expiresAt` is null or `expiresAt > now`. Expired rows are ignored on read; there is no cleanup job.
- A sold-out **group** covers every item in it, including items added later.
- **Fail open:** if the database cannot be read, the menu renders normally and checkout proceeds; the error is logged with `console.error`.
- Sold-out items stay visible, greyed, with a "Sold out" badge, and cannot be added to the cart. A sold-out group shows a "Currently sold out" banner.
- Admin server actions must re-verify the admin session (`verifySessionToken`) themselves.
- No new runtime dependencies.
- Only commit if the user has asked for commits in this session; never push without being asked. If not asked, leave changes staged/unstaged and say so.

## Review Focus

- **Item in two groups, only one group sold out.** The item is still orderable through the other group; checkout must not block it (Task 1 test `soldOutItemNames` "item in two groups").
- **"Today only" around midnight and DST.** Expiry is exactly the next Pacific midnight, including the 25-hour (fall-back) and 23-hour (spring-forward) days, and a request at exactly midnight rolls to the following midnight (Task 1 `midnightPacific` tests).
- **Database down.** Menu pages and checkout still work (Task 2 `getActiveSoldOut` returns `[]` on error; Task 6 manual check with a bad `DATABASE_URL`).
- **Stale admin page.** A form submitted for an id that is no longer in the Square menu is rejected with a message, not stored (Task 1 `findTarget` test; Task 5 action; Task 6 manual forged-id check).
- **Cart already holds the item when it sells out.** Checkout returns a 400 naming the item, and the cart UI shows that message (Task 1 `soldOutMessage` test; Task 4 routes; Task 6 manual check).

---

### Task 1: Pure logic, midnight helper, and test harness

**Files:**
- Create: `src/lib/sold-out/logic.ts`
- Create: `src/lib/sold-out/midnight.ts`
- Create: `tests/sold-out/logic.test.ts`
- Create: `tests/sold-out/midnight.test.ts`
- Modify: `src/lib/cart/types.ts` (add `soldOutMessage`)
- Modify: `src/lib/square/menu.ts` (add `soldOut` to the two view types and set `false` where built)
- Modify: `package.json` (add `test` script)
- Modify: `tsconfig.json` (add `allowImportingTsExtensions`)
- Modify: `docs/superpowers/specs/2026-10-12-sold-out-items-design.md` (rename column `until` to `expires_at`)

**Interfaces:**
- Produces (used by Tasks 2-5):
  - `type SoldOutKind = "group" | "item"`
  - `type SoldOutEntry = { squareId: string; kind: SoldOutKind; menuName: string; label: string; expiresAt: string | null; createdAt: string }`
  - `isActive(entry: SoldOutEntry, now: Date): boolean`
  - `activeEntries(entries: SoldOutEntry[], now: Date): SoldOutEntry[]`
  - `applySoldOut(menu: MenuView, active: SoldOutEntry[]): MenuView`
  - `soldOutItemNames(lines: Array<{ itemId: string; itemName: string }>, menu: MenuView, active: SoldOutEntry[]): string[]`
  - `findTarget(menu: MenuView, squareId: string): { kind: SoldOutKind; label: string } | null`
  - `midnightPacific(now: Date): Date`
  - `soldOutMessage(names: string[]): string` (in `src/lib/cart/types.ts`)
  - `MenuItemView.soldOut: boolean`, `MenuSectionView.soldOut: boolean`

- [ ] **Step 1: Add the `test` script and TS setting**

In `package.json`, add to `scripts`:

```json
"test": "node --test \"tests/**/*.test.ts\""
```

In `tsconfig.json`, add inside `compilerOptions` (it is allowed because `noEmit` is true):

```json
"allowImportingTsExtensions": true,
```

- [ ] **Step 2: Add `soldOut` to the menu view types**

In `src/lib/square/menu.ts`, add to `MenuItemView` (after `isWeekdayOnly`):

```ts
  /** Set per request by applySoldOut (src/lib/sold-out/logic.ts); always
   * false on the cached Square menu itself. */
  soldOut: boolean;
```

Add to `MenuSectionView` (after `items`):

```ts
  /** True when the whole group is marked sold out. Set by applySoldOut. */
  soldOut: boolean;
```

In `toMenuItemView`'s returned object add `soldOut: false,` after `isWeekdayOnly: ...,`. In `fetchMenuByName`'s section object add `soldOut: false,` after `items: groupItems,`.

- [ ] **Step 3: Write the failing logic tests**

Create `tests/sold-out/logic.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import {
  activeEntries,
  applySoldOut,
  findTarget,
  isActive,
  soldOutItemNames,
  type SoldOutEntry,
} from "../../src/lib/sold-out/logic.ts";
import { soldOutMessage } from "../../src/lib/cart/types.ts";

const NOW = new Date("2026-10-12T20:00:00Z");

function entry(over: Partial<SoldOutEntry>): SoldOutEntry {
  return {
    squareId: "x",
    kind: "item",
    menuName: "Menu",
    label: "X",
    expiresAt: null,
    createdAt: "2026-10-12T19:00:00Z",
    ...over,
  };
}

function item(id: string, name: string) {
  return {
    id,
    name,
    description: null,
    variations: [],
    modifierGroups: [],
    isWeekendOnly: false,
    isWeekdayOnly: false,
    soldOut: false,
  };
}

function section(id: string, name: string, items: ReturnType<typeof item>[]) {
  return { id, name, dayAvailability: "always" as const, items, soldOut: false };
}

const MENU = {
  id: "m1",
  name: "Menu",
  sections: [
    section("g1", "Biryani", [item("i1", "Chicken Biryani"), item("i2", "Egg Biryani")]),
    section("g2", "Specials", [item("i2", "Egg Biryani"), item("i3", "Mutton Fry")]),
  ],
};

test("isActive: no expiry is active", () => {
  assert.equal(isActive(entry({ expiresAt: null }), NOW), true);
});

test("isActive: future expiry is active, past expiry is not", () => {
  assert.equal(isActive(entry({ expiresAt: "2026-10-13T07:00:00Z" }), NOW), true);
  assert.equal(isActive(entry({ expiresAt: "2026-10-12T19:59:59Z" }), NOW), false);
});

test("isActive: expiry exactly now is not active", () => {
  assert.equal(isActive(entry({ expiresAt: NOW.toISOString() }), NOW), false);
});

test("isActive: unparseable expiry counts as not active (fails toward available)", () => {
  assert.equal(isActive(entry({ expiresAt: "garbage" }), NOW), false);
});

test("activeEntries filters out expired rows", () => {
  const rows = [
    entry({ squareId: "a" }),
    entry({ squareId: "b", expiresAt: "2026-10-12T00:00:00Z" }),
  ];
  assert.deepEqual(activeEntries(rows, NOW).map((e) => e.squareId), ["a"]);
});

test("applySoldOut: empty list returns the menu untouched", () => {
  assert.equal(applySoldOut(MENU, []), MENU);
});

test("applySoldOut: item entry marks that item in every group it appears in", () => {
  const out = applySoldOut(MENU, [entry({ squareId: "i2", kind: "item" })]);
  assert.equal(out.sections[0].items[1].soldOut, true);
  assert.equal(out.sections[1].items[0].soldOut, true);
  assert.equal(out.sections[0].items[0].soldOut, false);
  assert.equal(out.sections[0].soldOut, false);
});

test("applySoldOut: group entry marks the group and all its items", () => {
  const out = applySoldOut(MENU, [entry({ squareId: "g2", kind: "group" })]);
  assert.equal(out.sections[1].soldOut, true);
  assert.deepEqual(out.sections[1].items.map((i) => i.soldOut), [true, true]);
  assert.equal(out.sections[0].soldOut, false);
});

test("applySoldOut: group entry covers items it did not have when marked", () => {
  const grown = {
    ...MENU,
    sections: [
      { ...MENU.sections[0], items: [...MENU.sections[0].items, item("i9", "New Dish")] },
      MENU.sections[1],
    ],
  };
  const out = applySoldOut(grown, [entry({ squareId: "g1", kind: "group" })]);
  assert.equal(out.sections[0].items.at(-1)?.soldOut, true);
});

test("soldOutItemNames: names a sold-out item in the cart, once", () => {
  const lines = [
    { itemId: "i1", itemName: "Chicken Biryani" },
    { itemId: "i1", itemName: "Chicken Biryani" },
    { itemId: "i3", itemName: "Mutton Fry" },
  ];
  const names = soldOutItemNames(lines, MENU, [entry({ squareId: "i1", kind: "item" })]);
  assert.deepEqual(names, ["Chicken Biryani"]);
});

test("soldOutItemNames: item in two groups, only one group sold out, is NOT blocked", () => {
  const lines = [{ itemId: "i2", itemName: "Egg Biryani" }];
  const names = soldOutItemNames(lines, MENU, [entry({ squareId: "g1", kind: "group" })]);
  assert.deepEqual(names, []);
});

test("soldOutItemNames: item in two groups, both sold out, IS blocked", () => {
  const lines = [{ itemId: "i2", itemName: "Egg Biryani" }];
  const names = soldOutItemNames(lines, MENU, [
    entry({ squareId: "g1", kind: "group" }),
    entry({ squareId: "g2", kind: "group" }),
  ]);
  assert.deepEqual(names, ["Egg Biryani"]);
});

test("soldOutItemNames: items missing from the menu are ignored, nothing active returns []", () => {
  assert.deepEqual(
    soldOutItemNames([{ itemId: "gone", itemName: "Gone" }], MENU, [entry({ squareId: "g1", kind: "group" })]),
    []
  );
  assert.deepEqual(soldOutItemNames([{ itemId: "i1", itemName: "A" }], MENU, []), []);
});

test("findTarget: resolves a group, an item, and rejects an unknown id", () => {
  assert.deepEqual(findTarget(MENU, "g2"), { kind: "group", label: "Specials" });
  assert.deepEqual(findTarget(MENU, "i3"), { kind: "item", label: "Mutton Fry" });
  assert.equal(findTarget(MENU, "nope"), null);
});

test("soldOutMessage: singular and plural wording", () => {
  assert.equal(
    soldOutMessage(["Chicken Biryani"]),
    "Chicken Biryani is sold out right now. Please remove it from your cart to continue."
  );
  assert.equal(
    soldOutMessage(["A", "B", "C"]),
    "A, B and C are sold out right now. Please remove them from your cart to continue."
  );
});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL (cannot find module `../../src/lib/sold-out/logic.ts`).

- [ ] **Step 5: Implement `logic.ts`**

Create `src/lib/sold-out/logic.ts`:

```ts
import type { MenuView } from "@/lib/square/menu";

/**
 * Pure sold-out rules - no database, no Square, no clock of its own - so they
 * can be tested directly (tests/sold-out). The MenuView import above is
 * type-only and erased, so this file has no runtime imports and runs under
 * `node --test`.
 */

export type SoldOutKind = "group" | "item";

export type SoldOutEntry = {
  /** Square catalog id of the group (CATEGORY) or item. */
  squareId: string;
  kind: SoldOutKind;
  /** "Menu" or "Catering" - display only. */
  menuName: string;
  /** Name when it was marked, so the admin can list it. */
  label: string;
  /** ISO timestamp, or null for "until restored". */
  expiresAt: string | null;
  createdAt: string;
};

/** Active when there is no expiry, or the expiry is still in the future. An
 * unparseable expiry is treated as expired: a bad row should never hide food. */
export function isActive(entry: SoldOutEntry, now: Date): boolean {
  if (entry.expiresAt === null) return true;
  const expiresMs = Date.parse(entry.expiresAt);
  return Number.isFinite(expiresMs) && expiresMs > now.getTime();
}

export function activeEntries(entries: SoldOutEntry[], now: Date): SoldOutEntry[] {
  return entries.filter((entry) => isActive(entry, now));
}

function idsOfKind(active: SoldOutEntry[], kind: SoldOutKind): Set<string> {
  return new Set(active.filter((entry) => entry.kind === kind).map((entry) => entry.squareId));
}

/**
 * Overlays active entries on a menu. A group entry marks the group and every
 * item currently in it (so items added to the group later are covered); an
 * item entry marks that item wherever it appears in this menu.
 */
export function applySoldOut(menu: MenuView, active: SoldOutEntry[]): MenuView {
  if (active.length === 0) return menu;

  const groupIds = idsOfKind(active, "group");
  const itemIds = idsOfKind(active, "item");

  return {
    ...menu,
    sections: menu.sections.map((section) => {
      const groupSold = groupIds.has(section.id);
      return {
        ...section,
        soldOut: groupSold,
        items: section.items.map((item) => ({
          ...item,
          soldOut: groupSold || itemIds.has(item.id),
        })),
      };
    }),
  };
}

/**
 * Names of cart items that cannot be ordered because they are sold out.
 *
 * An item that appears in several groups is only blocked when it is sold out
 * in ALL of them: cart lines do not record which group they came from, and an
 * item still available through another group must stay orderable.
 */
export function soldOutItemNames(
  lines: Array<{ itemId: string; itemName: string }>,
  menu: MenuView,
  active: SoldOutEntry[]
): string[] {
  if (active.length === 0) return [];

  const applied = applySoldOut(menu, active);
  const appearances = new Map<string, boolean[]>();
  for (const section of applied.sections) {
    for (const item of section.items) {
      const flags = appearances.get(item.id) ?? [];
      flags.push(item.soldOut);
      appearances.set(item.id, flags);
    }
  }

  const names = new Set<string>();
  for (const line of lines) {
    const flags = appearances.get(line.itemId);
    if (flags && flags.every(Boolean)) names.add(line.itemName);
  }
  return [...names];
}

/** What a submitted Square id refers to in this menu, or null if it is not in
 * it (a stale admin page after the catalog changed). */
export function findTarget(
  menu: MenuView,
  squareId: string
): { kind: SoldOutKind; label: string } | null {
  for (const section of menu.sections) {
    if (section.id === squareId) return { kind: "group", label: section.name };
    for (const item of section.items) {
      if (item.id === squareId) return { kind: "item", label: item.name };
    }
  }
  return null;
}
```

- [ ] **Step 6: Add `soldOutMessage` to `src/lib/cart/types.ts`**

Append after `unavailableItemsSentence`:

```ts
/** e.g. "Veggie Noodles is sold out right now. Please remove it from your cart to continue." */
export function soldOutMessage(names: string[]): string {
  const plural = names.length > 1;
  return `${joinItemNames(names)} ${plural ? "are" : "is"} sold out right now. Please remove ${plural ? "them" : "it"} from your cart to continue.`;
}
```

- [ ] **Step 7: Run the logic tests to verify they pass**

Run: `npm test`
Expected: all tests in `logic.test.ts` PASS.

- [ ] **Step 8: Write the failing midnight tests**

Create `tests/sold-out/midnight.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { midnightPacific } from "../../src/lib/sold-out/midnight.ts";

const iso = (date: Date) => date.toISOString();

test("afternoon in daylight time rolls to the next Pacific midnight", () => {
  // 1:00 PM PDT on Oct 12 -> midnight Oct 13 PDT = 07:00Z
  assert.equal(iso(midnightPacific(new Date("2026-10-12T20:00:00Z"))), "2026-10-13T07:00:00.000Z");
});

test("one second before midnight still ends at that midnight", () => {
  // 11:59:59 PM PDT Oct 12
  assert.equal(iso(midnightPacific(new Date("2026-10-13T06:59:59Z"))), "2026-10-13T07:00:00.000Z");
});

test("exactly at midnight rolls to the following midnight", () => {
  assert.equal(iso(midnightPacific(new Date("2026-10-13T07:00:00Z"))), "2026-10-14T07:00:00.000Z");
});

test("fall-back day (25 hours): midnight after Nov 1 is 08:00Z (PST)", () => {
  assert.equal(iso(midnightPacific(new Date("2026-11-01T12:00:00Z"))), "2026-11-02T08:00:00.000Z");
});

test("spring-forward day (23 hours): midnight after Mar 8 is 07:00Z (PDT)", () => {
  assert.equal(iso(midnightPacific(new Date("2026-03-08T20:00:00Z"))), "2026-03-09T07:00:00.000Z");
});

test("month and year rollover", () => {
  // 5:00 PM PST on Dec 31 -> midnight Jan 1 PST = 08:00Z
  assert.equal(iso(midnightPacific(new Date("2026-12-31T17:00:00-08:00"))), "2027-01-01T08:00:00.000Z");
});
```

- [ ] **Step 9: Run to verify failure**

Run: `npm test`
Expected: FAIL (cannot find module `midnight.ts`).

- [ ] **Step 10: Implement `midnight.ts`**

Create `src/lib/sold-out/midnight.ts`:

```ts
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

const TIME_ZONE = "America/Los_Angeles";

/**
 * The next midnight in Pacific time strictly after `now` - when a "today only"
 * sold-out entry should clear. Works on the calendar *date* in Pacific time
 * rather than adding 24 hours, so the 23-hour and 25-hour daylight-saving days
 * come out right. A `now` that is exactly midnight rolls to the following one.
 *
 * Imports date-fns-tz directly (not src/lib/time-slots.ts) so this file has no
 * "@/" alias imports and can run under `node --test`.
 */
export function midnightPacific(now: Date): Date {
  const today = formatInTimeZone(now, TIME_ZONE, "yyyy-MM-dd");
  const [year, month, day] = today.split("-").map(Number);
  const tomorrow = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
  return fromZonedTime(`${tomorrow}T00:00:00`, TIME_ZONE);
}
```

- [ ] **Step 11: Run all tests, typecheck and lint**

Run: `npm test`
Expected: PASS (logic + midnight).

Run: `npx tsc --noEmit`
Expected: no output (this proves every `MenuItemView`/`MenuSectionView` producer sets `soldOut`; fix any it flags by setting `soldOut: false`).

Run: `npx eslint src/lib/sold-out src/lib/cart/types.ts src/lib/square/menu.ts tests`
Expected: no output.

- [ ] **Step 12: Keep the spec in sync**

In `docs/superpowers/specs/2026-10-12-sold-out-items-design.md`, in the Data table change the row for `until` to:

```
| `expires_at` | timestamptz, nullable | Expiry; null means until restored |
```

and replace the remaining mentions of `until` as a column/field (the "An entry is **active** when `until`..." sentence and the module descriptions) with `expires_at`.

- [ ] **Step 13: Commit (only if the user asked for commits)**

```bash
git add package.json tsconfig.json src/lib/sold-out src/lib/cart/types.ts src/lib/square/menu.ts tests docs/superpowers/specs/2026-10-12-sold-out-items-design.md
git commit -m "Add sold-out rules, Pacific-midnight helper and unit tests"
```

---

### Task 2: Storage and cached read

**Files:**
- Create: `src/lib/sold-out/store.ts`
- Create: `src/lib/sold-out/read.ts`

**Interfaces:**
- Consumes: `SoldOutEntry`, `SoldOutKind`, `activeEntries` from Task 1; `getSql` from `src/lib/db.ts`.
- Produces:
  - `listAll(): Promise<SoldOutEntry[]>` (raw rows, including expired; uncached)
  - `markSoldOut(args: { squareId: string; kind: SoldOutKind; menuName: string; label: string; expiresAt: string | null }): Promise<void>`
  - `restore(squareId: string): Promise<void>`
  - `SOLD_OUT_CACHE_TAG: "sold-out"`
  - `getActiveSoldOut(now?: Date): Promise<SoldOutEntry[]>` (cached 30 s, filtered by `now` on every call, fails open)

- [ ] **Step 1: Write `store.ts`**

```ts
import "server-only";
import { getSql } from "@/lib/db";
import type { SoldOutEntry, SoldOutKind } from "./logic";

/**
 * Sold-out menu groups/items. Table is created on first use, matching the
 * newsletter_subscribers pattern, so a fresh database needs no migration.
 * `expires_at` is NULL for "until restored".
 */
let schemaReady: Promise<void> | undefined;

function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    const attempt = (async () => {
      const sql = getSql();
      await sql`
        CREATE TABLE IF NOT EXISTS sold_out_items (
          square_id TEXT PRIMARY KEY,
          kind TEXT NOT NULL CHECK (kind IN ('group', 'item')),
          menu_name TEXT NOT NULL,
          label TEXT NOT NULL,
          expires_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
    })();

    attempt.catch(() => {
      schemaReady = undefined;
    });

    schemaReady = attempt;
  }

  return schemaReady;
}

type Row = {
  square_id: string;
  kind: SoldOutKind;
  menu_name: string;
  label: string;
  expires_at: string | Date | null;
  created_at: string | Date;
};

function toIso(value: string | Date): string {
  return new Date(value).toISOString();
}

/** Every row, including expired ones. Callers filter with activeEntries. */
export async function listAll(): Promise<SoldOutEntry[]> {
  await ensureSchema();
  const sql = getSql();

  const rows = (await sql`
    SELECT square_id, kind, menu_name, label, expires_at, created_at
    FROM sold_out_items
    ORDER BY created_at DESC
  `) as Row[];

  return rows.map((row) => ({
    squareId: row.square_id,
    kind: row.kind,
    menuName: row.menu_name,
    label: row.label,
    expiresAt: row.expires_at === null ? null : toIso(row.expires_at),
    createdAt: toIso(row.created_at),
  }));
}

/** Insert, or replace the existing row for the same id (changing duration). */
export async function markSoldOut(args: {
  squareId: string;
  kind: SoldOutKind;
  menuName: string;
  label: string;
  expiresAt: string | null;
}): Promise<void> {
  await ensureSchema();
  const sql = getSql();

  await sql`
    INSERT INTO sold_out_items (square_id, kind, menu_name, label, expires_at)
    VALUES (${args.squareId}, ${args.kind}, ${args.menuName}, ${args.label}, ${args.expiresAt})
    ON CONFLICT (square_id) DO UPDATE SET
      kind = EXCLUDED.kind,
      menu_name = EXCLUDED.menu_name,
      label = EXCLUDED.label,
      expires_at = EXCLUDED.expires_at,
      created_at = now()
  `;
}

export async function restore(squareId: string): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  await sql`DELETE FROM sold_out_items WHERE square_id = ${squareId}`;
}
```

- [ ] **Step 2: Write `read.ts`**

```ts
import "server-only";
import { unstable_cache } from "next/cache";
import { listAll } from "./store";
import { activeEntries, type SoldOutEntry } from "./logic";

export const SOLD_OUT_CACHE_TAG = "sold-out";

/** Raw rows are cached briefly (a toggle in the admin busts the tag at once).
 * Expiry is NOT part of the cache: rows are filtered against the real clock on
 * every call, so a "today only" entry ends exactly at midnight even while the
 * cached list is up to 30 s old. */
const CACHE_SECONDS = 30;

const cachedRows = unstable_cache(listAll, ["sold-out-rows"], {
  revalidate: CACHE_SECONDS,
  tags: [SOLD_OUT_CACHE_TAG],
});

/**
 * Entries that are sold out right now. Fails open: if the database cannot be
 * read, log it and report nothing sold out, so a database blip never hides the
 * whole menu or blocks every order.
 */
export async function getActiveSoldOut(now: Date = new Date()): Promise<SoldOutEntry[]> {
  try {
    return activeEntries(await cachedRows(), now);
  } catch (error) {
    console.error("[sold-out] Could not read sold-out list; treating nothing as sold out:", error);
    return [];
  }
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npx eslint src/lib/sold-out`
Expected: no output.

- [ ] **Step 4: Commit (only if the user asked for commits)**

```bash
git add src/lib/sold-out/store.ts src/lib/sold-out/read.ts
git commit -m "Add sold_out_items storage and cached fail-open read"
```

---

### Task 3: Show sold-out items on the public menu pages

**Files:**
- Modify: `src/components/menu-page.tsx`
- Modify: `src/components/menu-sections.tsx`
- Modify: `src/components/menu-item-card.tsx`
- Modify: `src/components/menu-item-card.css`
- Modify: `src/app/order-online/page.tsx`
- Modify: `src/app/catering/page.tsx`

**Interfaces:**
- Consumes: `getActiveSoldOut` (Task 2), `applySoldOut` and `MenuItemView.soldOut` / `MenuSectionView.soldOut` (Task 1).

- [ ] **Step 1: Overlay the sold-out state in `menu-page.tsx`**

Add imports:

```ts
import { applySoldOut } from "@/lib/sold-out/logic";
import { getActiveSoldOut } from "@/lib/sold-out/read";
```

Replace these existing lines:

```tsx
  let menu;
  try {
    menu = await getMenuByName(menuName);
  } catch (error) {
```

with:

```tsx
  let baseMenu;
  try {
    baseMenu = await getMenuByName(menuName);
  } catch (error) {
```

Leave the `catch` body (the early-return error section) unchanged. Then, directly after the closing `}` of that `catch` block and before `return (`, add:

```tsx
  const menu = applySoldOut(baseMenu, await getActiveSoldOut());
```

Everything below keeps using `menu` (`menu.sections`).

- [ ] **Step 2: Make sold-out items non-clickable and show a group banner in `menu-sections.tsx`**

Change the item card line to:

```tsx
            <MenuItemCard
              item={item}
              key={item.id}
              onClick={item.soldOut ? undefined : () => setOpenItem(item)}
            />
```

Directly under `<h2>{activeSection.name}</h2>` add:

```tsx
        {activeSection.soldOut ? (
          <p className="menu-section-soldout">Currently sold out</p>
        ) : null}
```

- [ ] **Step 3: Grey the card and add a badge in `menu-item-card.tsx`**

Change the `<article className=...>` expression to include a sold-out class:

```tsx
      className={[
        "menu-item-card",
        clickable ? "menu-item-card--clickable" : "",
        item.soldOut ? "menu-item-card--soldout" : "",
      ]
        .filter(Boolean)
        .join(" ")}
```

Add `aria-disabled={item.soldOut || undefined}` to the `<article>`, and put the badge as the first child of `.menu-item-card-body`:

```tsx
        {item.soldOut ? <span className="menu-item-card-soldout-badge">Sold out</span> : null}
```

- [ ] **Step 4: Style it in `menu-item-card.css`**

Append:

```css
.menu-item-card--soldout {
  opacity: 0.55;
  filter: grayscale(0.7);
}

.menu-item-card-soldout-badge {
  align-self: flex-start;
  margin-bottom: 0.35rem;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  background: #3b2417;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.menu-section-soldout {
  margin: 0 0 1rem;
  padding: 0.6rem 1rem;
  border-radius: 10px;
  background: rgba(59, 36, 23, 0.08);
  color: #3b2417;
  font-weight: 500;
}
```

- [ ] **Step 5: Render both pages per request**

Both pages must reflect a toggle immediately, so opt out of static rendering (the menu *structure* is still served from its 1-hour cache). In `src/app/order-online/page.tsx` and `src/app/catering/page.tsx`, add below the `metadata` export:

```ts
// Sold-out state changes during the day; render per request. The Square menu
// itself is still cached for an hour (src/lib/square/menu.ts) and the sold-out
// list for 30 s (src/lib/sold-out/read.ts), so this stays cheap.
export const dynamic = "force-dynamic";
```

- [ ] **Step 6: Typecheck, lint and run the tests**

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npx eslint src/components/menu-page.tsx src/components/menu-sections.tsx src/components/menu-item-card.tsx src/app/order-online/page.tsx src/app/catering/page.tsx`
Expected: no output.

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Verify the pages still render with nothing sold out**

Start the dev server (`preview_start` with `bom-dev`), then:

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/order-online` and the same for `/catering`.
Expected: `200` for both, and no `Sold out` text in the body (`curl -s http://localhost:3000/order-online | grep -c "menu-item-card-soldout-badge"` prints `0`). Stop the server afterwards.

- [ ] **Step 8: Commit (only if the user asked for commits)**

```bash
git add src/components src/app/order-online/page.tsx src/app/catering/page.tsx
git commit -m "Show sold-out items and groups on the public menu pages"
```

---

### Task 4: Enforce sold-out at checkout

**Files:**
- Create: `src/lib/sold-out/checkout.ts`
- Modify: `src/app/api/checkout/order-online/route.ts`
- Modify: `src/app/api/checkout/catering/route.ts`

**Interfaces:**
- Consumes: `getActiveSoldOut` (Task 2), `soldOutItemNames` (Task 1), `soldOutMessage` (Task 1), `getMenuByName`, `SQUARE_MENU_NAMES`.
- Produces: `findSoldOutItemNames(menuName: string, lines: Array<{ itemId: string; itemName: string }>): Promise<string[]>`

- [ ] **Step 1: Write `checkout.ts`**

```ts
import "server-only";
import { getMenuByName } from "@/lib/square/menu";
import { getActiveSoldOut } from "./read";
import { soldOutItemNames } from "./logic";

/**
 * Names of cart items that are sold out right now, for the checkout endpoints.
 * Server-side defense in depth: the page greys sold-out items, but a cart
 * built earlier (or a tampered request) must not be able to order them.
 * Fails open like the rest of this feature - if the menu or the list cannot be
 * read, order creation proceeds rather than every checkout being blocked.
 */
export async function findSoldOutItemNames(
  menuName: string,
  lines: Array<{ itemId: string; itemName: string }>
): Promise<string[]> {
  try {
    const active = await getActiveSoldOut();
    if (active.length === 0) return [];
    const menu = await getMenuByName(menuName);
    return soldOutItemNames(lines, menu, active);
  } catch (error) {
    console.error("[sold-out] Checkout check failed; allowing the order:", error);
    return [];
  }
}
```

- [ ] **Step 2: Call it from the Order Online route**

In `src/app/api/checkout/order-online/route.ts` add imports:

```ts
import { SQUARE_MENU_NAMES } from "@/lib/square/config";
import { findSoldOutItemNames } from "@/lib/sold-out/checkout";
```

and add `soldOutMessage` to the existing `@/lib/cart/types` import list. Insert immediately before the `try {` that calls `createCheckout`:

```ts
  const soldOutNames = await findSoldOutItemNames(SQUARE_MENU_NAMES.onlineOrdering, body.lines);
  if (soldOutNames.length > 0) {
    return NextResponse.json({ ok: false, error: soldOutMessage(soldOutNames) }, { status: 400 });
  }

```

- [ ] **Step 3: Call it from the Catering route**

In `src/app/api/checkout/catering/route.ts` add the same two imports, add `soldOutMessage` to its `@/lib/cart/types` import, and insert before the `try {` that calls `createCheckout`:

```ts
  const soldOutNames = await findSoldOutItemNames(SQUARE_MENU_NAMES.catering, body.lines);
  if (soldOutNames.length > 0) {
    return NextResponse.json({ ok: false, error: soldOutMessage(soldOutNames) }, { status: 400 });
  }

```

- [ ] **Step 4: Typecheck, lint, test**

Run: `npx tsc --noEmit` — Expected: no output.
Run: `npx eslint src/lib/sold-out src/app/api/checkout` — Expected: no output.
Run: `npm test` — Expected: PASS.

- [ ] **Step 5: Verify checkout is unaffected when nothing is sold out**

With the dev server running, an empty-lines request must still return the existing error (proving the new code is not reached before validation):

Run: `curl -s -X POST http://localhost:3000/api/checkout/order-online -H "content-type: application/json" -d '{"lines":[]}'`
Expected: `{"ok":false,"error":"Your cart is empty."}`

- [ ] **Step 6: Commit (only if the user asked for commits)**

```bash
git add src/lib/sold-out/checkout.ts src/app/api/checkout
git commit -m "Reject sold-out items at Order Online and Catering checkout"
```

---

### Task 5: Admin screen

**Files:**
- Create: `src/app/admin/(dashboard)/sold-out/actions.ts`
- Create: `src/app/admin/(dashboard)/sold-out/page.tsx`
- Create: `src/components/admin-sold-out-list.tsx`
- Modify: `src/app/admin/(dashboard)/page.tsx` (hub card)
- Modify: `src/app/admin/admin.css`

**Interfaces:**
- Consumes: `listAll`, `markSoldOut`, `restore` (Task 2); `SOLD_OUT_CACHE_TAG` (Task 2); `findTarget`, `activeEntries`, `SoldOutEntry` (Task 1); `midnightPacific` (Task 1); `getMenuByName`, `SQUARE_MENU_NAMES`; `verifySessionToken`, `SESSION_COOKIE_NAME`; `AdminNotice`, `describeError`.
- Produces: server actions `markSoldOutAction(formData: FormData): Promise<void>` and `restoreAction(formData: FormData): Promise<void>`. Form fields: `menu` (menu name), `id` (Square id), and for marking `duration` = `today` | `until-restored`.

- [ ] **Step 1: Write the server actions**

`src/app/admin/(dashboard)/sold-out/actions.ts`:

```ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { SESSION_COOKIE_NAME } from "@/lib/admin/config";
import { verifySessionToken } from "@/lib/admin/session";
import { SQUARE_MENU_NAMES } from "@/lib/square/config";
import { getMenuByName } from "@/lib/square/menu";
import { findTarget } from "@/lib/sold-out/logic";
import { midnightPacific } from "@/lib/sold-out/midnight";
import { SOLD_OUT_CACHE_TAG } from "@/lib/sold-out/read";
import { markSoldOut, restore } from "@/lib/sold-out/store";

const MENU_NAMES: string[] = [SQUARE_MENU_NAMES.onlineOrdering, SQUARE_MENU_NAMES.catering];

/** Server actions are public POST endpoints: re-check the session here rather
 * than trusting that the page which rendered the form was gated. */
async function requireAdmin(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!(await verifySessionToken(token))) redirect("/admin/login");
}

/** Back to the list. redirect() throws, so callers must not wrap it in try/catch. */
function backTo(menuName: string, error?: string): never {
  const params = new URLSearchParams({
    menu: menuName === SQUARE_MENU_NAMES.catering ? "catering" : "menu",
  });
  if (error) params.set("error", error);
  redirect(`/admin/sold-out?${params.toString()}`);
}

export async function markSoldOutAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const menuName = String(formData.get("menu") ?? "");
  const squareId = String(formData.get("id") ?? "");
  const duration = String(formData.get("duration") ?? "");

  if (
    !MENU_NAMES.includes(menuName) ||
    !squareId ||
    (duration !== "today" && duration !== "until-restored")
  ) {
    backTo(menuName, "That request wasn't valid. Please try again.");
  }

  let failure: string | null = null;
  try {
    const menu = await getMenuByName(menuName);
    const target = findTarget(menu, squareId);
    if (!target) {
      // A stale page: the item or group is no longer in the Square menu.
      failure = "That item is no longer on the menu. The list has been refreshed.";
    } else {
      await markSoldOut({
        squareId,
        kind: target.kind,
        menuName,
        label: target.label,
        expiresAt: duration === "today" ? midnightPacific(new Date()).toISOString() : null,
      });
      updateTag(SOLD_OUT_CACHE_TAG);
    }
  } catch (error) {
    console.error("[sold-out] Could not mark sold out:", error);
    failure = "Couldn't save that. Please try again.";
  }

  backTo(menuName, failure ?? undefined);
}

export async function restoreAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const menuName = String(formData.get("menu") ?? "");
  const squareId = String(formData.get("id") ?? "");

  if (!MENU_NAMES.includes(menuName) || !squareId) {
    backTo(menuName, "That request wasn't valid. Please try again.");
  }

  let failure: string | null = null;
  try {
    await restore(squareId);
    updateTag(SOLD_OUT_CACHE_TAG);
  } catch (error) {
    console.error("[sold-out] Could not restore:", error);
    failure = "Couldn't save that. Please try again.";
  }

  backTo(menuName, failure ?? undefined);
}
```

- [ ] **Step 2: Write the list component**

`src/components/admin-sold-out-list.tsx`:

```tsx
import type { MenuView } from "@/lib/square/menu";
import type { SoldOutEntry } from "@/lib/sold-out/logic";
import {
  markSoldOutAction,
  restoreAction,
} from "@/app/admin/(dashboard)/sold-out/actions";

function chipLabel(entry: SoldOutEntry): string {
  return entry.expiresAt === null ? "Sold out · until restored" : "Sold out · today";
}

function Controls({
  menuName,
  id,
  entry,
  lockedNote,
}: {
  menuName: string;
  id: string;
  entry: SoldOutEntry | undefined;
  lockedNote?: string;
}) {
  if (lockedNote) return <span className="admin-soldout-note">{lockedNote}</span>;

  if (entry) {
    return (
      <form action={restoreAction} className="admin-soldout-controls">
        <input type="hidden" name="menu" value={menuName} />
        <input type="hidden" name="id" value={id} />
        <button type="submit" className="admin-soldout-btn admin-soldout-btn--restore">
          Restore
        </button>
      </form>
    );
  }

  return (
    <form action={markSoldOutAction} className="admin-soldout-controls">
      <input type="hidden" name="menu" value={menuName} />
      <input type="hidden" name="id" value={id} />
      <button type="submit" name="duration" value="today" className="admin-soldout-btn">
        Sold out today
      </button>
      <button
        type="submit"
        name="duration"
        value="until-restored"
        className="admin-soldout-btn admin-soldout-btn--ghost"
      >
        Sold out until restored
      </button>
    </form>
  );
}

/** One menu's groups and items with their sold-out controls. Server-rendered:
 * every control is a plain form posting to a server action. */
export function AdminSoldOutList({
  menu,
  menuName,
  active,
}: {
  menu: MenuView;
  menuName: string;
  active: SoldOutEntry[];
}) {
  const byId = new Map(active.map((entry) => [entry.squareId, entry]));

  return (
    <div className="admin-soldout-list">
      {menu.sections.map((section) => {
        const groupEntry = byId.get(section.id);

        return (
          <section key={section.id} className="admin-soldout-group">
            <div className="admin-soldout-row admin-soldout-row--group">
              <div>
                <strong>{section.name}</strong>
                {groupEntry ? (
                  <span className="admin-soldout-chip">{chipLabel(groupEntry)}</span>
                ) : null}
              </div>
              <Controls menuName={menuName} id={section.id} entry={groupEntry} />
            </div>

            <details>
              <summary>
                {section.items.length} item{section.items.length === 1 ? "" : "s"}
              </summary>
              <ul className="admin-soldout-items">
                {section.items.map((item) => {
                  const itemEntry = byId.get(item.id);
                  return (
                    <li key={item.id} className="admin-soldout-row">
                      <div>
                        {item.name}
                        {itemEntry ? (
                          <span className="admin-soldout-chip">{chipLabel(itemEntry)}</span>
                        ) : null}
                      </div>
                      <Controls
                        menuName={menuName}
                        id={item.id}
                        entry={itemEntry}
                        lockedNote={groupEntry ? "Sold out (group)" : undefined}
                      />
                    </li>
                  );
                })}
              </ul>
            </details>
          </section>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Write the page**

`src/app/admin/(dashboard)/sold-out/page.tsx`:

```tsx
import Link from "next/link";
import { AdminNotice, describeError } from "@/components/admin-notice";
import { AdminSoldOutList } from "@/components/admin-sold-out-list";
import { SQUARE_MENU_NAMES } from "@/lib/square/config";
import { getMenuByName, type MenuView } from "@/lib/square/menu";
import { activeEntries, type SoldOutEntry } from "@/lib/sold-out/logic";
import { listAll } from "@/lib/sold-out/store";

const MENUS = [
  { key: "menu", label: "Menu", name: SQUARE_MENU_NAMES.onlineOrdering },
  { key: "catering", label: "Catering", name: SQUARE_MENU_NAMES.catering },
] as const;

export default async function AdminSoldOutPage({
  searchParams,
}: {
  searchParams: Promise<{ menu?: string; error?: string }>;
}) {
  const params = await searchParams;
  const current = MENUS.find((menu) => menu.key === params.menu) ?? MENUS[0];

  // Loading and JSX live in separate scopes: a try/catch around markup would
  // not catch render-time errors (same note as admin-orders-section.tsx).
  let menu: MenuView | null = null;
  let active: SoldOutEntry[] = [];
  let failure: unknown = null;

  try {
    [menu, active] = await Promise.all([
      getMenuByName(current.name),
      // Straight from the table, not the 30 s cache: staff must see their own
      // change immediately.
      listAll().then((rows) => activeEntries(rows, new Date())),
    ]);
  } catch (error) {
    failure = error;
    console.error("[admin] Failed to load the sold-out list:", error);
  }

  return (
    <>
      <h1 className="admin-page-title">Sold Out</h1>
      <p className="admin-page-sub">
        Mark a menu group or a single item as sold out. Customers see it greyed out and
        can&apos;t order it. &ldquo;Today&rdquo; clears itself at midnight Pacific.
      </p>

      <nav className="admin-tabs" aria-label="Menu">
        {MENUS.map((entry) => (
          <Link
            key={entry.key}
            className="admin-tab"
            href={entry.key === "menu" ? "/admin/sold-out" : `/admin/sold-out?menu=${entry.key}`}
            aria-current={entry.key === current.key ? "page" : undefined}
          >
            {entry.label}
          </Link>
        ))}
      </nav>

      {params.error ? <AdminNotice title="That didn't work" detail={params.error} /> : null}

      {menu ? (
        <AdminSoldOutList menu={menu} menuName={current.name} active={active} />
      ) : (
        <AdminNotice title="Couldn't load the menu" detail={describeError(failure)} />
      )}
    </>
  );
}
```

- [ ] **Step 4: Add the hub card**

In `src/app/admin/(dashboard)/page.tsx`, add to `OPTIONS` before the "Contact Us" entry:

```ts
  {
    href: "/admin/sold-out",
    title: "Sold Out",
    description:
      "Mark a menu group or item as sold out so customers can't order it.",
  },
```

- [ ] **Step 5: Add styles**

Append to `src/app/admin/admin.css`:

```css
/* ---------- Sold out ---------- */

.admin-soldout-list {
  display: grid;
  gap: 0.9rem;
}

.admin-soldout-group {
  background: var(--cream, #fbf3e3);
  border-radius: 16px;
  padding: 1rem 1.25rem;
}

.admin-soldout-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0.5rem 0;
}

.admin-soldout-row--group {
  padding-top: 0;
}

.admin-soldout-items {
  list-style: none;
  margin: 0.5rem 0 0;
  padding: 0;
  border-top: 1px solid rgba(59, 36, 23, 0.12);
}

.admin-soldout-items .admin-soldout-row {
  border-bottom: 1px solid rgba(59, 36, 23, 0.08);
}

.admin-soldout-group summary {
  cursor: pointer;
  font-size: 0.88rem;
  color: var(--brown-soft, #6b5648);
}

.admin-soldout-controls {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.admin-soldout-btn {
  font: inherit;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--brown, #3b2417);
  background: var(--brown, #3b2417);
  color: #fff;
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
}

.admin-soldout-btn--ghost {
  background: transparent;
  color: var(--brown, #3b2417);
}

.admin-soldout-btn--restore {
  background: #2e7d32;
  border-color: #2e7d32;
}

.admin-soldout-chip {
  margin-left: 0.6rem;
  padding: 0.12rem 0.6rem;
  border-radius: 999px;
  background: #b3261e;
  color: #fff;
  font-size: 0.74rem;
  font-weight: 600;
}

.admin-soldout-note {
  font-size: 0.82rem;
  color: var(--brown-soft, #6b5648);
}
```

- [ ] **Step 6: Typecheck, lint, test**

Run: `npx tsc --noEmit` — Expected: no output.
Run: `npx eslint "src/app/admin" src/components/admin-sold-out-list.tsx` — Expected: no output.
Run: `npm test` — Expected: PASS.

- [ ] **Step 7: Verify the page is gated**

With the dev server running:

Run: `curl -s -o /dev/null -D - "http://localhost:3000/admin/sold-out?menu=catering" | grep -iE "^(HTTP|location)"`
Expected: `HTTP/1.1 307 Temporary Redirect` and `location: /admin/login` (the proxy gates the new route; signing in is manual, see Task 6).

- [ ] **Step 8: Commit (only if the user asked for commits)**

```bash
git add "src/app/admin" src/components/admin-sold-out-list.tsx
git commit -m "Add the admin Sold Out screen"
```

---

### Task 6: Docs and end-to-end verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document the feature in `README.md`**

Add `/admin/sold-out` to the **Admin** route list, and add this section after "Pagination (25 per page)":

```markdown
### Sold-out items

`/admin/sold-out` lets staff mark a menu **group** or **item** sold out, per menu
(Menu / Catering), either *today only* (clears at midnight Pacific) or *until
restored*. State lives in the Neon table `sold_out_items` (created on first
use); Square's own sold-out flag is read-only to apps, so it cannot be used.

- Public pages (`/order-online`, `/catering`) grey sold-out items with a badge and
  block add-to-cart; a sold-out group shows a "Currently sold out" banner. Both
  pages render per request (`dynamic = "force-dynamic"`); the Square menu is still
  cached for an hour.
- Both checkout endpoints reject sold-out items server-side with a 400 naming them.
- The raw list is cached for 30 s and busted instantly by the admin actions;
  expiry is always checked against the real clock, so "today" ends exactly at
  Pacific midnight.
- **Fails open:** if the database can't be read, the menu renders and orders go
  through (logged with `[sold-out]`).
- A group covers all its items. An item in two groups is only blocked at
  checkout when sold out in every group it appears in.
- Logic is pure and tested: `npm test` (Node's built-in runner).
```

- [ ] **Step 2: Full automated checks**

Run: `npm test` — Expected: PASS.
Run: `npx tsc --noEmit` — Expected: no output.
Run: `npm run build` — Expected: build succeeds; in the route table `/order-online` and `/catering` are shown as dynamic (`ƒ`) and `/admin/sold-out` as dynamic.

- [ ] **Step 3: Manual verification (needs the admin password, so the user runs this)**

Start `npm run dev`, sign in at `/admin`, then:

1. Open **Sold Out**. Menu and Catering tabs both list their groups; expand a group to see its items.
2. Click **Sold out today** on one item. A red "Sold out · today" chip appears with a **Restore** button.
3. Open `/order-online` (or `/catering`) in another tab: the item is greyed with a "Sold out" badge and clicking it opens nothing.
4. Click **Sold out until restored** on a whole group. Its items show "Sold out (group)"; the public group shows the "Currently sold out" banner.
5. Put an item in the cart first, then mark it sold out and try to check out: the form shows "X is sold out right now. Please remove it from your cart to continue."
6. **Restore** each; the public page returns to normal at once.
7. **Fail-open:** stop the server, set `DATABASE_URL` in `.env.local` to a wrong value, restart: `/order-online` still renders the full menu and the terminal logs `[sold-out] Could not read sold-out list`. Restore the correct value afterwards.
8. **Stale/forged id:** in the browser dev tools edit a button form's hidden `id` to `bogus` and submit: the page returns with "That item is no longer on the menu".

- [ ] **Step 4: Commit (only if the user asked for commits)**

```bash
git add README.md
git commit -m "Document the sold-out feature"
```
