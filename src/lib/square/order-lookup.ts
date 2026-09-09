import "server-only";
import type { Square } from "square";
import { getSquareClient, getSquareLocationId } from "./client";

/**
 * Finds an order by its `reference_id` (our `bb-<uuid>` token). Square's
 * SearchOrders API has no reference-id filter, so this scans orders created
 * within a recent window (paginating by cursor) and matches locally - fine
 * at this volume, and it works in sandbox too (unlike Square-appended
 * redirect params, which only happen in production).
 */
const LOOKBACK_WINDOW_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 100;

export async function findOrderByReferenceId(
  referenceId: string
): Promise<Square.Order | null> {
  const client = getSquareClient();
  const locationId = getSquareLocationId();
  const startAt = new Date(Date.now() - LOOKBACK_WINDOW_MS).toISOString();

  const baseRequest = {
    locationIds: [locationId],
    limit: PAGE_SIZE,
    query: {
      filter: {
        dateTimeFilter: {
          createdAt: { startAt },
        },
      },
      sort: {
        sortField: "CREATED_AT",
        sortOrder: "DESC",
      },
    },
  } satisfies Square.SearchOrdersRequest;

  let cursor: string | undefined;
  do {
    const response = await client.orders.search({
      ...baseRequest,
      cursor,
    });
    for (const order of response.orders ?? []) {
      if (order.referenceId === referenceId) return order;
    }
    cursor = response.cursor;
  } while (cursor);

  return null;
}
