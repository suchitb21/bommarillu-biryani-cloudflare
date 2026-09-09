import { NextResponse } from "next/server";
import { getSquareClient, getSquareLocationId } from "@/lib/square/client";
import { serializeBigInts } from "@/lib/square/serialize";

/**
 * Phase 1 sanity check: confirms SQUARE_ACCESS_TOKEN / SQUARE_LOCATION_ID
 * actually work against the real account before any menu-fetching code
 * gets built on top of them.
 */
export async function GET() {
  try {
    const client = getSquareClient();
    const locationId = getSquareLocationId();

    const { locations } = await client.locations.list();
    const matchedLocation = locations?.find((l) => l.id === locationId);

    const catalogPage = await client.catalog.list({ types: "CATEGORY" });

    return NextResponse.json(
      serializeBigInts({
        ok: true,
        environment: process.env.SQUARE_ENVIRONMENT,
        locationIdConfigured: locationId,
        locationFound: Boolean(matchedLocation),
        locationName: matchedLocation?.name ?? null,
        allLocations: locations?.map((l) => ({ id: l.id, name: l.name })) ?? [],
        firstCategoryPage: catalogPage.data,
      })
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
