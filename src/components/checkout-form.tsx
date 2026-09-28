"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import "./checkout-form.css";
import {
  earliestDateForLeadTime,
  getAvailableSlots,
  isWeekendDate,
  orderingAvailability,
  todayInRestaurantTimeZone,
} from "@/lib/time-slots";
import type { CheckoutAddress, FulfillmentMethod } from "@/lib/checkout/types";
import { computeSalesTaxCents, SALES_TAX_NAME, SALES_TAX_PERCENT } from "@/lib/checkout/tax";
import { CATERING_DELIVERY_FEE_CENTS, CATERING_DELIVERY_FEE_NAME } from "@/lib/checkout/delivery-fee";

export type CheckoutFormValues = {
  name: string;
  phone: string;
  fulfillmentMethod: FulfillmentMethod;
  address?: CheckoutAddress;
  eventDate?: string;
  timeSlot: string;
  /** Catering only - free-text kitchen instructions. */
  specialInstructions?: string;
};

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function CheckoutForm({
  showEventDate,
  requiresWeekendEventDate = false,
  minLeadMinutes,
  deliveryHelpText,
  externalDeliveryHref,
  submitLabel,
  totalCents,
  onSubmit,
}: {
  /** Catering only - lets the customer pick a future event date instead of
   * always ordering for today. */
  showEventDate: boolean;
  /** Catering only - true when the cart has a weekend-only item, restricting
   * the event date to a Saturday/Sunday. */
  requiresWeekendEventDate?: boolean;
  minLeadMinutes: number;
  /** Shown under the method toggle when in-form delivery is available
   * (catering: delivery is staff-arranged). Ignored when
   * `externalDeliveryHref` is set. */
  deliveryHelpText?: string;
  /** Order Online only. When set, delivery is NOT collected in this form -
   * the Delivery button opens this URL (the Cash App / Square ordering
   * profile, the only surface that can dispatch a courier) in a new tab,
   * and this checkout handles pickup only. */
  externalDeliveryHref?: string;
  submitLabel: string;
  /** Pre-tax subtotal in cents - sales tax is computed from the shared
   * SALES_TAX constant and shown as its own row (Square charges the same
   * ad-hoc tax on the order it creates). */
  totalCents: number;
  onSubmit: (values: CheckoutFormValues) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>("pickup");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [eventDate, setEventDate] = useState(() =>
    showEventDate ? earliestDateForLeadTime(minLeadMinutes) : todayInRestaurantTimeZone()
  );
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Sales tax is computed here from the same constant the server attaches to
  // the Square order, so Square charges exactly what this form shows.
  const salesTaxCents = computeSalesTaxCents(totalCents);

  // Catering "delivery" carries a flat NON-TAXABLE $70 delivery fee - shown
  // as its own row and kept OUT of the tax base, matching the order service
  // charge Square receives (`taxable: false`).
  const hasDeliveryFee = showEventDate && fulfillmentMethod === "delivery";
  const deliveryFeeCents = hasDeliveryFee ? CATERING_DELIVERY_FEE_CENTS : 0;
  const grandTotalCents = totalCents + salesTaxCents + deliveryFeeCents;

  const dateForSlots = showEventDate ? eventDate : todayInRestaurantTimeZone();
  const slots = useMemo(
    () => getAvailableSlots(dateForSlots, minLeadMinutes),
    [dateForSlots, minLeadMinutes]
  );

  // Derived rather than synced via an effect: if the date changed and the
  // previously-picked slot is no longer in range, fall back to the first
  // available one for display/submission without a render-then-setState
  // round trip.
  const selectedTimeSlot = slots.some((slot) => slot.value === timeSlot) ? timeSlot : (slots[0]?.value ?? "");

  const minEventDate = showEventDate ? earliestDateForLeadTime(minLeadMinutes) : undefined;

  // Order Online: delivery lives on the Cash App / Square ordering profile,
  // so when externalDeliveryHref is set the only in-form method is pickup.
  const hasExternalDelivery = Boolean(externalDeliveryHref);

  // Order Online (same-day pickup) is only "active" while the restaurant is
  // open per its weekly timetable. Catering orders a future event date, so
  // it is never gated by "right now".
  const availability = useMemo(
    () => (showEventDate ? null : orderingAvailability()),
    [showEventDate]
  );
  const onlineOrderingClosed = availability !== null && !availability.isOpen;

  // Order Online has no date picker (it's always "today"), so a weekend-only
  // item can't be fixed by choosing a different date the way Catering can -
  // the whole completion section is replaced with an explanation instead of
  // a submit-time error. Catering keeps the softer inline-hint + validation
  // treatment below since the customer CAN just pick a Fri/Sat/Sun date.
  const blockedByWeekendOnlyToday =
    !showEventDate && requiresWeekendEventDate && !isWeekendDate(dateForSlots);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Please enter your name.");
    if (!phone.trim()) return setError("Please enter a phone number.");
    if (requiresWeekendEventDate && !isWeekendDate(dateForSlots)) {
      return setError(
        showEventDate
          ? "Your order includes an item only available Friday-Sunday - please choose one of those event dates."
          : "Your order includes an item only available Friday-Sunday - please come back then."
      );
    }
    if (!selectedTimeSlot) return setError("Please choose a time.");
    if (
      fulfillmentMethod === "delivery" &&
      (!addressLine1.trim() || !city.trim() || !state.trim() || !postalCode.trim())
    ) {
      return setError("Please complete the delivery address.");
    }
    if (!agreedToTerms) {
      return setError("Please agree to the Terms & Conditions and Privacy Policy to continue.");
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        phone: phone.trim(),
        fulfillmentMethod,
        address:
          fulfillmentMethod === "delivery"
            ? {
                addressLine1: addressLine1.trim(),
                addressLine2: addressLine2.trim() || undefined,
                city: city.trim(),
                state: state.trim(),
                postalCode: postalCode.trim(),
              }
            : undefined,
        eventDate: showEventDate ? eventDate : undefined,
        timeSlot: selectedTimeSlot,
        specialInstructions: showEventDate ? specialInstructions.trim() || undefined : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form className="checkout-form" onSubmit={handleSubmit}>
      <h2>Your details</h2>

      <div className="checkout-row">
        <div className="checkout-field">
          <label htmlFor="checkout-name">Name</label>
          <input
            id="checkout-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div className="checkout-field">
          <label htmlFor="checkout-phone">Phone</label>
          <input
            id="checkout-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
        </div>
      </div>

      <div className="checkout-field">
        <label>Pickup or delivery?</label>
        <div className="checkout-method-toggle">
          <button
            type="button"
            className={
              fulfillmentMethod === "pickup" ? "checkout-method-btn checkout-method-btn--active" : "checkout-method-btn"
            }
            onClick={() => setFulfillmentMethod("pickup")}
          >
            Pickup
          </button>
          {externalDeliveryHref ? (
            <button
              type="button"
              className="checkout-method-btn"
              onClick={() => window.open(externalDeliveryHref, "_blank", "noopener")}
            >
              Delivery
            </button>
          ) : (
            <button
              type="button"
              className={
                fulfillmentMethod === "delivery"
                  ? "checkout-method-btn checkout-method-btn--active"
                  : "checkout-method-btn"
              }
              onClick={() => setFulfillmentMethod("delivery")}
            >
              Delivery
            </button>
          )}
        </div>
        {externalDeliveryHref ? (
          <p className="checkout-help">
            Delivery orders are placed on our delivery ordering page so a courier can be
            dispatched &mdash; same menu and prices. This form is for pickup.
          </p>
        ) : fulfillmentMethod === "delivery" && deliveryHelpText ? (
          <p className="checkout-help">{deliveryHelpText}</p>
        ) : null}
      </div>

      {fulfillmentMethod === "delivery" ? (
        <>
          <div className="checkout-field">
            <label htmlFor="checkout-address1">Address</label>
            <input
              id="checkout-address1"
              type="text"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              autoComplete="address-line1"
              placeholder="Street address"
            />
          </div>
          <div className="checkout-field">
            <label htmlFor="checkout-address2">Apt / suite (optional)</label>
            <input
              id="checkout-address2"
              type="text"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              autoComplete="address-line2"
            />
          </div>
          <div className="checkout-row">
            <div className="checkout-field">
              <label htmlFor="checkout-city">City</label>
              <input
                id="checkout-city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                autoComplete="address-level2"
              />
            </div>
            <div className="checkout-field">
              <label htmlFor="checkout-state">State</label>
              <input
                id="checkout-state"
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                autoComplete="address-level1"
                placeholder="CA"
              />
            </div>
          </div>
          <div className="checkout-field">
            <label htmlFor="checkout-postal">ZIP code</label>
            <input
              id="checkout-postal"
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              autoComplete="postal-code"
            />
          </div>
        </>
      ) : null}

      {showEventDate ? (
        <div className="checkout-field">
          <label htmlFor="checkout-event-date">Event date</label>
          <input
            id="checkout-event-date"
            type="date"
            value={eventDate}
            min={minEventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
          {requiresWeekendEventDate ? (
            <p className="checkout-help">
              Your order includes an item only available Friday-Sunday &mdash; please choose
              one of those dates.
            </p>
          ) : null}
        </div>
      ) : null}

      {showEventDate ? (
        <div className="checkout-field">
          <label htmlFor="checkout-special-instructions">Special instructions (optional)</label>
          <textarea
            id="checkout-special-instructions"
            rows={3}
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="Allergies, dietary needs, platter setup, napkin/serving notes, etc."
            maxLength={500}
          />
        </div>
      ) : null}

      {onlineOrderingClosed ? (
        <div className="checkout-closed">
          <p className="checkout-closed-title">We&rsquo;re closed for online ordering right now.</p>
          {availability?.opensLabel ? (
            <p className="checkout-closed-sub">
              Online ordering reopens {availability.opensLabel}.
            </p>
          ) : null}
          <p className="checkout-help">
            You can still browse the menu - or use the delivery link above, which follows its own hours.
          </p>
        </div>
      ) : blockedByWeekendOnlyToday ? (
        <div className="checkout-closed">
          <p className="checkout-closed-title">
            Your order includes an item only available Friday-Sunday.
          </p>
          <p className="checkout-closed-sub">
            Please come back then, or remove that item to order the rest today.
          </p>
        </div>
      ) : (
        <>
          <div className="checkout-field">
            <label htmlFor="checkout-time">
              {showEventDate ? "Event time" : hasExternalDelivery ? "Pickup time" : "Pickup/delivery time"} (Pacific)
            </label>
            {slots.length === 0 ? (
              <p className="checkout-no-slots">No times available for that date - please call us.</p>
            ) : (
              <select id="checkout-time" value={selectedTimeSlot} onChange={(e) => setTimeSlot(e.target.value)}>
                {slots.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="checkout-totals">
            <div className="checkout-totals-row">
              <span>Subtotal</span>
              <span>{formatMoney(totalCents)}</span>
            </div>
            {hasDeliveryFee ? (
              <div className="checkout-totals-row">
                <span>
                  {CATERING_DELIVERY_FEE_NAME} (non-taxable)
                </span>
                <span>{formatMoney(deliveryFeeCents)}</span>
              </div>
            ) : null}
            <div className="checkout-totals-row">
              <span>
                {SALES_TAX_NAME} ({SALES_TAX_PERCENT}%)
              </span>
              <span>{formatMoney(salesTaxCents)}</span>
            </div>
            <div className="checkout-totals-row checkout-totals-row--grand">
              <span>Total</span>
              <span>{formatMoney(grandTotalCents)}</span>
            </div>
          </div>

          <div className="checkout-consent">
            <label className="checkout-consent-label">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => {
                  setAgreedToTerms(e.target.checked);
                  setError(null);
                }}
              />
              <span>
                I agree to the{" "}
                <Link href="/terms" target="_blank" rel="noopener noreferrer">
                  Terms &amp; Conditions
                </Link>{" "}
                and{" "}
                <Link href="/privacy" target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </Link>
                . You must agree before paying.
              </span>
            </label>
          </div>

          {error ? <p className="checkout-error">{error}</p> : null}

          <button
            type="submit"
            className="checkout-submit-btn"
            disabled={!agreedToTerms || submitting || slots.length === 0}
          >
            <span>{submitting ? "Redirecting to payment..." : submitLabel}</span>
            <span>{formatMoney(grandTotalCents)}</span>
          </button>
        </>
      )}
    </form>
  );
}
