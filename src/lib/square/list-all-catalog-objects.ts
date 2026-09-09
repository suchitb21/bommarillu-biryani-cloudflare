import "server-only";
import type { SquareClient, Square } from "square";

/**
 * `client.catalog.list()` does NOT auto-paginate — `.data` on the awaited
 * result is only the current page (Square's default page size is 100), and
 * simply reading `.data` will silently return incomplete results with no
 * error. The returned `Page` is an async iterable that fetches subsequent
 * pages as you consume it, so iterating it here is what actually walks the
 * full result set.
 */
export async function listAllCatalogObjects(
  client: SquareClient,
  types: string
): Promise<Square.CatalogObject[]> {
  const objects: Square.CatalogObject[] = [];
  const page = await client.catalog.list({ types });

  for await (const object of page) {
    objects.push(object);
  }

  return objects;
}
