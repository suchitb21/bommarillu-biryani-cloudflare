import { NextRequest, NextResponse } from "next/server";
import { createCheckout } from "@/lib/checkout/build-order";
import { todayInRestaurantTimeZone, zonedDateTimeToUtc } from "@/lib/time-slots";
import type { OrderOnlineCheckoutRequest, CheckoutResponse } from "@/lib/checkout/types";

// Matches the lead time the /cart checkout form uses to build its slot list.
const MIN_LEAD_MINUTES = 45;

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
  if (body.fulfillmentMethod === "delivery" && !body.address) {
    return NextResponse.json({ ok: false, error: "Delivery address is required." }, { status: 400 });
  }

  const dateStr = todayInRestaurantTimeZone();

  // Defense in depth: the client only shows slots past the lead time, but
  // don't trust that - a slot chosen minutes ago could now be in the past.
  const instant = zonedDateTimeToUtc(dateStr, body.timeSlot);
  if (instant.getTime() < Date.now() + (MIN_LEAD_MINUTES - 1) * 60_000) {
    return NextResponse.json(
      { ok: false, error: "That time has passed - please choose a later time." },
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
      dateStr,
      timeStr: body.timeSlot,
      // Order Online is enrolled in Square's real On-Demand Delivery.
      allowOnDemandDelivery: true,
      noteContext: "Order Online",
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
