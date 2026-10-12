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
