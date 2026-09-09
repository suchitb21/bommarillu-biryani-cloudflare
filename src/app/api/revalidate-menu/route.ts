import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { SQUARE_MENU_CACHE_TAG } from "@/lib/square/config";

/**
 * Hit this after editing the catalog in Square to bust the cached menu data
 * immediately, instead of waiting for the hourly revalidation window.
 * Example: /api/revalidate-menu?secret=...
 */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  const expected = process.env.REVALIDATE_SECRET;

  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "REVALIDATE_SECRET is not configured on the server." },
      { status: 500 }
    );
  }

  if (secret !== expected) {
    return NextResponse.json({ ok: false, error: "Invalid secret." }, { status: 401 });
  }

  // Called from outside a Server Action (a manually-hit URL), so updateTag()
  // isn't available - { expire: 0 } is Next's documented way to force the
  // next request to block on a fresh fetch instead of serving stale data.
  revalidateTag(SQUARE_MENU_CACHE_TAG, { expire: 0 });

  return NextResponse.json({ ok: true, revalidated: SQUARE_MENU_CACHE_TAG, at: new Date().toISOString() });
}
