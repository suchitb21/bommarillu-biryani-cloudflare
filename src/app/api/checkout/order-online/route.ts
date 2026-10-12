import { NextRequest, NextResponse } from "next/server";
import { createCheckout } from "@/lib/checkout/build-order";
import {
  isTimeWithinOpenHours,
  isWeekendDate,
  orderingAvailability,
  todayInRestaurantTimeZone,
  zonedDateTimeToUtc,
} from "@/lib/time-slots";
import {
  soldOutMessage,
  unavailableItemsSentence,
  weekdayOnlyItemNames,
  weekendOnlyItemNames,
} from "@/lib/cart/types";
import { SQUARE_MENU_NAMES } from "@/lib/square/config";
import { findSoldOutItemNames } from "@/lib/sold-out/checkout";
import type { OrderOnlineCheckoutRequest, CheckoutResponse } from "@/lib/checkout/types";

// Matches the lead time the /cart checkout form uses to build its slot list.
const MIN_LEAD_MINUTES = 20;

/**
 * Order Online is pickup-only on this site. Delivery is handled on the
 * restaurant's Cash App / Square ordering profile (the only surface that can
 * dispatch a courier) and never reaches this endpoint - see
 * src/lib/delivery.ts. This endpoint therefore always builds a PICKUP order.
 */
export async function POST(request: NextRequest): Promise<NextResponse<CheckoutResponse>> {
  let body: OrderOnlineCheckoutRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  if (!body.lines?.length) {
    return NextResponse.json({ ok: false, error: "Your cart is empty." }, { status: 400 });
  }
  if (!body.name?.trim() || !body.phone?.trim()) {
    return NextResponse.json({ ok: false, error: "Name and phone are required." }, { status: 400 });
  }
  if (!body.timeSlot) {
    return NextResponse.json({ ok: false, error: "Please choose a time." }, { status: 400 });
  }
  // Defense in depth: this endpoint must never create a delivery order. A
  // tampered client sending "delivery" is told where delivery actually
  // lives instead.
  const requestedMethod: string = body.fulfillmentMethod;
  if (requestedMethod !== "pickup") {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Delivery orders are placed on our delivery ordering page - this checkout is for pickup only.",
      },
      { status: 400 }
    );
  }

  const dateStr = todayInRestaurantTimeZone();

  // Defense in depth: don't trust the client's weekend-only gating alone.
  // Order Online has no date picker (always "today"), so this can't be
  // fixed by choosing another date the way Catering can.
  const weekendItems = weekendOnlyItemNames(body.lines);
  if (weekendItems.length > 0 && !isWeekendDate(dateStr)) {
    return NextResponse.json(
      {
        ok: false,
        error: `${unavailableItemsSentence(weekendItems, "Friday–Sunday")} Please come back then.`,
      },
      { status: 400 }
    );
  }

  const weekdayItems = weekdayOnlyItemNames(body.lines);
  if (weekdayItems.length > 0 && isWeekendDate(dateStr)) {
    return NextResponse.json(
      {
        ok: false,
        error: `${unavailableItemsSentence(weekdayItems, "Monday–Thursday")} Please come back on a weekday.`,
      },
      { status: 400 }
    );
  }

  // Ordering is only "active" while the restaurant is open per its weekly
  // timetable (same check the checkout form shows) - reject anything that
  // slips through while closed.
  const availability = orderingAvailability();
  if (!availability.isOpen) {
    return NextResponse.json(
      {
        ok: false,
        error: `We're closed for online ordering right now${availability.opensLabel ? ` - it reopens ${availability.opensLabel}` : ""}.`,
      },
      { status: 400 }
    );
  }

  // Defense in depth: the client only shows slots inside the day's open
  // windows, but never trust that either.
  if (!isTimeWithinOpenHours(dateStr, body.timeSlot)) {
    return NextResponse.json(
      { ok: false, error: "That pickup time is outside our hours - please choose a time we're open." },
      { status: 400 }
    );
  }

  // Defense in depth: the client only shows slots past the lead time, but
  // don't trust that - a slot chosen minutes ago could now be in the past.
  const instant = zonedDateTimeToUtc(dateStr, body.timeSlot);
  if (instant.getTime() < Date.now() + (MIN_LEAD_MINUTES - 1) * 60_000) {
    return NextResponse.json(
      { ok: false, error: "That time has passed - please choose a later time." },
      { status: 400 }
    );
  }

  const soldOutNames = await findSoldOutItemNames(SQUARE_MENU_NAMES.onlineOrdering, body.lines);
  if (soldOutNames.length > 0) {
    return NextResponse.json({ ok: false, error: soldOutMessage(soldOutNames) }, { status: 400 });
  }

  try {
    const { url } = await createCheckout({
      lines: body.lines,
      name: body.name,
      phone: body.phone,
      fulfillmentMethod: "pickup",
      dateStr,
      timeStr: body.timeSlot,
      noteContext: "Order Online",
      channel: "order-online",
      redirectUrl: `${request.nextUrl.origin}/order-confirmation`,
    });
    return NextResponse.json({ ok: true, url });
  } catch (error) {
    console.error("Order Online checkout failed:", error);
    return NextResponse.json(
      { ok: false, error: "We couldn't start checkout. Please try again or call us." },
      { status: 500 }
    );
  }
}
