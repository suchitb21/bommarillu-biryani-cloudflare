import { NextRequest, NextResponse } from "next/server";
import { createCheckout } from "@/lib/checkout/build-order";
import { isTimeWithinOpenHours, isWeekendDate, zonedDateTimeToUtc } from "@/lib/time-slots";
import { cartRequiresWeekendEventDate } from "@/lib/cart/types";
import type { CateringCheckoutRequest, CheckoutResponse } from "@/lib/checkout/types";

// Matches the lead time the catering checkout form uses to build its date/slot list.
const MIN_LEAD_MINUTES = 24 * 60;

export async function POST(request: NextRequest): Promise<NextResponse<CheckoutResponse>> {
  let body: CateringCheckoutRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  if (!body.lines?.length) {
    return NextResponse.json({ ok: false, error: "Your catering order is empty." }, { status: 400 });
  }
  if (!body.name?.trim() || !body.phone?.trim()) {
    return NextResponse.json({ ok: false, error: "Name and phone are required." }, { status: 400 });
  }
  if (!body.eventDate || !body.timeSlot) {
    return NextResponse.json({ ok: false, error: "Please choose an event date and time." }, { status: 400 });
  }
  if (body.fulfillmentMethod === "delivery" && !body.address) {
    return NextResponse.json({ ok: false, error: "Delivery address is required." }, { status: 400 });
  }

  // Defense in depth: don't trust the client's weekend-only gating alone.
  if (cartRequiresWeekendEventDate(body.lines) && !isWeekendDate(body.eventDate)) {
    return NextResponse.json(
      {
        ok: false,
        error: "This order includes an item only available Friday-Sunday - please choose one of those event dates.",
      },
      { status: 400 }
    );
  }

  // Catering orders are for a future event date, so "right now" is never a
  // gate - but the chosen event time must still fall inside that date's open
  // windows (defense in depth on top of the client's slot list).
  if (!isTimeWithinOpenHours(body.eventDate, body.timeSlot)) {
    return NextResponse.json(
      { ok: false, error: "That event time is outside our hours - please choose a time the restaurant is open." },
      { status: 400 }
    );
  }

  // Defense in depth: don't trust the client's lead-time filtering alone.
  const instant = zonedDateTimeToUtc(body.eventDate, body.timeSlot);
  if (instant.getTime() < Date.now() + (MIN_LEAD_MINUTES - 1) * 60_000) {
    return NextResponse.json(
      { ok: false, error: "Catering orders need at least 24 hours' notice - please choose a later time." },
      { status: 400 }
    );
  }

  try {
    const { url } = await createCheckout({
      lines: body.lines,
      name: body.name,
      phone: body.phone,
      fulfillmentMethod: body.fulfillmentMethod,
      address: body.address,
      dateStr: body.eventDate,
      timeStr: body.timeSlot,
      specialInstructions: body.specialInstructions,
      // Catering "delivery" stays a PICKUP fulfillment with the address on
      // the recipient and in the note - Square's courier dispatch is not
      // available for API-created orders (see src/lib/delivery.ts), and
      // catering orders are too large for courier partners anyway. Staff
      // arrange the delivery themselves.
      noteContext: "Catering order",
      channel: "catering",
      redirectUrl: `${request.nextUrl.origin}/order-confirmation`,
    });
    return NextResponse.json({ ok: true, url });
  } catch (error) {
    console.error("Catering checkout failed:", error);
    return NextResponse.json(
      { ok: false, error: "We couldn't start checkout. Please try again or call us." },
      { status: 500 }
    );
  }
}
