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
