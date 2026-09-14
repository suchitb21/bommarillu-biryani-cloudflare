import "server-only";
import type { Square } from "square";
import { unstable_cache } from "next/cache";
import { getSquareClient } from "./client";
import { listAllCatalogObjects } from "./list-all-catalog-objects";
import {
  SQUARE_MENU_CACHE_TAG,
  SQUARE_MENU_REVALIDATE_SECONDS,
  WEEKEND_ONLY_CATEGORY_NAMES,
} from "./config";

export type MenuItemVariationView = {
  id: string;
  name: string;
  priceCents: number | null;
  priceLabel: string;
  hasFixedPrice: boolean;
};

export type ModifierOptionView = {
  id: string;
  name: string;
  priceCents: number;
  priceLabel: string | null;
};

export type ModifierGroupView = {
  id: string;
  name: string;
  /** Radio (pick exactly one) vs checkbox (pick zero-or-more, up to max) selection. */
  selectionType: "SINGLE" | "MULTIPLE";
  minSelected: number;
  /** null = no cap. */
  maxSelected: number | null;
  options: ModifierOptionView[];
};

export type MenuItemView = {
  id: string;
  name: string;
  description: string | null;
  imageUrl?: string;
  variations: MenuItemVariationView[];
  modifierGroups: ModifierGroupView[];
  /** True when this item is in one of WEEKEND_ONLY_CATEGORY_NAMES - the
   * catering checkout restricts the event date to a Saturday/Sunday when a
   * line like this is in the cart. */
  isWeekendOnly: boolean;
};

export type MenuSectionView = {
  id: string;
  name: string;
  items: MenuItemView[];
};

export type MenuView = {
  id: string;
  name: string;
  sections: MenuSectionView[];
};

function isCategory(object: Square.CatalogObject): object is Square.CatalogObject.Category {
  return object.type === "CATEGORY";
}

function isItem(object: Square.CatalogObject): object is Square.CatalogObject.Item {
  return object.type === "ITEM";
}

function isImage(object: Square.CatalogObject): object is Square.CatalogObject.Image {
  return object.type === "IMAGE";
}

function isModifierList(
  object: Square.CatalogObject
): object is Square.CatalogObject.ModifierList {
  return object.type === "MODIFIER_LIST";
}

function isItemVariation(
  object: Square.CatalogObject
): object is Square.CatalogObject.ItemVariation {
  return object.type === "ITEM_VARIATION";
}

function isModifier(object: Square.CatalogObject): object is Square.CatalogObject.Modifier {
  return object.type === "MODIFIER";
}

function formatMoney(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amountCents / 100);
}

/**
 * Square represents "no selection required" / "no maximum" with 0 or -1
 * depending on the field and whether it's null - normalize both to a single
 * meaning instead of scattering that logic through the mapping code.
 */
function normalizeCount(value: number | bigint | null | undefined): number | null {
  if (value == null) return null;
  const n = Number(value);
  return n <= 0 ? null : n;
}

function toModifierGroupView(
  modifierListInfo: Square.CatalogItemModifierListInfo,
  modifierListsById: Map<string, Square.CatalogObject.ModifierList>
): ModifierGroupView | null {
  if (modifierListInfo.enabled === false) return null;

  const list = modifierListsById.get(modifierListInfo.modifierListId);
  if (!list?.modifierListData) return null;

  const data = list.modifierListData;

  // Item-level min/max (via CatalogItemModifierListInfo) override the modifier
  // list's own defaults, but only per-field, and only when actually set
  // (Square uses -1 for "not set" on both).
  const minSelected =
    normalizeCount(modifierListInfo.minSelectedModifiers) ?? normalizeCount(data.minSelectedModifiers) ?? 0;
  const maxSelected =
    normalizeCount(modifierListInfo.maxSelectedModifiers) ?? normalizeCount(data.maxSelectedModifiers);

  const options: ModifierOptionView[] = (data.modifiers ?? [])
    .filter(isModifier)
    .map((modifier) => {
      const amount = modifier.modifierData?.priceMoney?.amount;
      const priceCents = amount != null ? Number(amount) : 0;
      return {
        id: modifier.id,
        name: modifier.modifierData?.name ?? "Option",
        priceCents,
        priceLabel:
          priceCents > 0
            ? formatMoney(priceCents, modifier.modifierData?.priceMoney?.currency ?? "USD")
            : null,
      };
    });

  if (options.length === 0) return null;

  return {
    id: list.id,
    name: data.name ?? "Options",
    // maxSelected === 1 is the practical signal for "pick one" (radio) -
    // Square's own `selectionType` field is deprecated in favor of min/max.
    selectionType: maxSelected === 1 ? "SINGLE" : "MULTIPLE",
    minSelected,
    maxSelected,
    options,
  };
}

function toMenuItemView(
  item: Square.CatalogObject.Item,
  imageUrlById: Map<string, string>,
  modifierListsById: Map<string, Square.CatalogObject.ModifierList>,
  weekendOnlyCategoryIds: Set<string>
): MenuItemView {
  const firstImageId = item.itemData?.imageIds?.[0];
  const imageUrl = firstImageId ? imageUrlById.get(firstImageId) : undefined;

  const variations: MenuItemVariationView[] = (item.itemData?.variations ?? [])
    .filter(isItemVariation)
    .map((variation) => {
      const data = variation.itemVariationData;
      const amount = data?.priceMoney?.amount;
      // Some variations use open/market pricing and have no fixed priceMoney -
      // never assume one exists, or you'll show $0/NaN instead of the real state.
      const hasFixedPrice = data?.pricingType !== "VARIABLE_PRICING" && amount != null;
      const priceCents = hasFixedPrice ? Number(amount) : null;

      return {
        id: variation.id,
        name: data?.name ?? item.itemData?.name ?? "Item",
        priceCents,
        priceLabel:
          priceCents != null ? formatMoney(priceCents, data?.priceMoney?.currency ?? "USD") : "Market price",
        hasFixedPrice,
      };
    });

  const modifierGroups = (item.itemData?.modifierListInfo ?? [])
    .map((info) => toModifierGroupView(info, modifierListsById))
    .filter((group): group is ModifierGroupView => group !== null);

  const isWeekendOnly = (item.itemData?.categories ?? []).some(
    (ref) => ref.id != null && weekendOnlyCategoryIds.has(ref.id)
  );

  return {
    id: item.id,
    name: item.itemData?.name ?? "Untitled item",
    description: item.itemData?.descriptionPlaintext ?? item.itemData?.description ?? null,
    imageUrl,
    variations,
    modifierGroups,
    isWeekendOnly,
  };
}

/**
 * Resolves a top-level Menu (a CATEGORY object with categoryType MENU_CATEGORY
 * and isTopLevel true, e.g. "Menu" or "Catering") by name, along with its
 * Menu Groups and their items.
 *
 * This still reads the *structure* live from Square (no hardcoded category/item
 * ids) - what's cached below is the result of that read, not the ids. The menu
 * doesn't change often, so re-running the paginated Square API calls (categories,
 * items, images, modifier lists) on every single page view is wasted latency;
 * caching it means only the first visitor after the cache expires (or after an
 * explicit revalidate) pays that cost.
 */
async function fetchMenuByName(menuName: string): Promise<MenuView> {
  const client = getSquareClient();

  const [categoryObjects, itemObjects, imageObjects, modifierListObjects] = await Promise.all([
    listAllCatalogObjects(client, "CATEGORY"),
    listAllCatalogObjects(client, "ITEM"),
    listAllCatalogObjects(client, "IMAGE"),
    listAllCatalogObjects(client, "MODIFIER_LIST"),
  ]);

  const categories = categoryObjects.filter(isCategory);
  const items = itemObjects.filter(isItem);
  const images = imageObjects.filter(isImage);
  const modifierLists = modifierListObjects.filter(isModifierList);

  const imageUrlById = new Map<string, string>();
  for (const image of images) {
    if (image.imageData?.url) {
      imageUrlById.set(image.id, image.imageData.url);
    }
  }

  const modifierListsById = new Map<string, Square.CatalogObject.ModifierList>();
  for (const list of modifierLists) {
    modifierListsById.set(list.id, list);
  }

  // Items in one of the WEEKEND_ONLY_CATEGORY_NAMES Catering menu groups are
  // weekend-only - these are the restaurant's own existing display sections,
  // not a separate hidden tag.
  const weekendOnlyNames = new Set(WEEKEND_ONLY_CATEGORY_NAMES.map((name) => name.toLowerCase()));
  const weekendOnlyCategoryIds = new Set(
    categories
      .filter((category) => weekendOnlyNames.has((category.categoryData?.name ?? "").trim().toLowerCase()))
      .map((category) => category.id)
      .filter((id): id is string => id != null)
  );

  const menu = categories.find(
    (category) =>
      category.categoryData?.categoryType === "MENU_CATEGORY" &&
      category.categoryData?.isTopLevel &&
      category.categoryData?.name === menuName
  );

  if (!menu) {
    throw new Error(`No top-level menu named "${menuName}" was found in the Square catalog.`);
  }

  const groups = categories
    .filter((category) => category.categoryData?.parentCategory?.id === menu.id)
    .sort(
      (a, b) =>
        Number(a.categoryData?.parentCategory?.ordinal ?? 0) -
        Number(b.categoryData?.parentCategory?.ordinal ?? 0)
    );

  const sections: MenuSectionView[] = groups.map((group) => {
    const groupItems = items
      .map((item) => {
        const categoryRef = item.itemData?.categories?.find((c) => c.id === group.id);
        return categoryRef
          ? { item, ordinal: Number(categoryRef.ordinal ?? 0) }
          : null;
      })
      .filter((entry): entry is { item: Square.CatalogObject.Item; ordinal: number } => entry !== null)
      .sort((a, b) => a.ordinal - b.ordinal)
      .map(({ item }) => toMenuItemView(item, imageUrlById, modifierListsById, weekendOnlyCategoryIds));

    return {
      // The SDK types `id` as optional on CatalogObjectCategory (it also
      // doubles as the lightweight category-reference shape), but every
      // real CATEGORY object returned by the API has one.
      id: group.id!,
      name: group.categoryData?.name ?? "Untitled",
      items: groupItems,
    };
  });

  return {
    id: menu.id!,
    name: menu.categoryData?.name ?? menuName,
    sections,
  };
}

export const getMenuByName = unstable_cache(fetchMenuByName, ["square-menu-by-name"], {
  revalidate: SQUARE_MENU_REVALIDATE_SECONDS,
  tags: [SQUARE_MENU_CACHE_TAG],
});
