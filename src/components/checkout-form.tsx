"use client";

import { useMemo, useState } from "react";
import "./checkout-form.css";
import {
  earliestDateForLeadTime,
  getAvailableSlots,
  todayInRestaurantTimeZone,
} from "@/lib/time-slots";
import type { CheckoutAddress, FulfillmentMethod } from "@/lib/checkout/types";

export type CheckoutFormValues = {
  name: string;
  phone: string;
  fulfillmentMethod: FulfillmentMethod;
  address?: CheckoutAddress;
  eventDate?: string;
  timeSlot: string;
};

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function CheckoutForm({
  showEventDate,
  minLeadMinutes,
  deliveryHelpText,
  externalDeliveryHref,
  taxNote,
  submitLabel,
  totalCents,
  onSubmit,
}: {
  /** Catering only - lets the customer pick a future event date instead of
   * always ordering for today. */
  showEventDate: boolean;
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
  /** Optional note shown just above the pay button - e.g. that the shown
   * total excludes sales tax, which Square adds at checkout. */
  taxNote?: string;
  submitLabel: string;
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
  const [timeSlot, setTimeSlot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Please enter your name.");
    if (!phone.trim()) return setError("Please enter a phone number.");
    if (!selectedTimeSlot) return setError("Please choose a time.");
    if (
      fulfillmentMethod === "delivery" &&
      (!addressLine1.trim() || !city.trim() || !state.trim() || !postalCode.trim())
    ) {
      return setError("Please complete the delivery address.");
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
        </div>
      ) : null}

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

      {taxNote ? <p className="checkout-help">{taxNote}</p> : null}

      {error ? <p className="checkout-error">{error}</p> : null}

      <button type="submit" className="checkout-submit-btn" disabled={submitting || slots.length === 0}>
        <span>{submitting ? "Redirecting to payment..." : submitLabel}</span>
        <span>{formatMoney(totalCents)}</span>
      </button>
    </form>
  );
}
