"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import "./checkout-form.css";
import {
  cateringDeliveryTimeCutoff,
  earliestDateForLeadTime,
  getAvailableSlots,
  isCateringDeliveryAvailableForDate,
  isWeekendDate,
  orderingAvailability,
  todayInRestaurantTimeZone,
  CATERING_DELIVERY_FRIDAY_CUTOFF_LABEL,
} from "@/lib/time-slots";
import type { CheckoutAddress, FulfillmentMethod } from "@/lib/checkout/types";
import { computeSalesTaxCents, SALES_TAX_NAME, SALES_TAX_PERCENT } from "@/lib/checkout/tax";
import {
  CATERING_DELIVERY_FEE_NAME,
  CATERING_DELIVERY_MAX_MILES,
  CATERING_DELIVERY_TIERS,
  getCateringDeliveryTier,
} from "@/lib/checkout/delivery-fee";

export type CheckoutFormValues = {
  name: string;
  phone: string;
  fulfillmentMethod: FulfillmentMethod;
  address?: CheckoutAddress;
  /** Catering delivery only - the customer's self-selected distance band id
   * (see CATERING_DELIVERY_TIERS in delivery-fee.ts). */
  deliveryDistanceTierId?: string;
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
  /** Order Online only. Omit entirely for Catering (in-form delivery).
   * A string opens that URL (the Cash App / Square ordering profile) in a
   * new tab instead of collecting delivery in this form. `null` means Order
   * Online delivery exists as a concept but currently has no working link -
   * the Delivery button renders disabled instead of silently falling back
   * to the in-form address flow, which this checkout doesn't actually
   * dispatch a courier for. */
  externalDeliveryHref?: string | null;
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
  const [deliveryDistanceTierId, setDeliveryDistanceTierId] = useState("");
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

  const dateForSlots = showEventDate ? eventDate : todayInRestaurantTimeZone();

  // Catering delivery has its own day/time limit on top of the restaurant's
  // open hours - Monday-Friday, Friday only until a cutoff, judged against
  // the event date (not when the order is placed). Falls back to pickup
  // without discarding the customer's raw delivery preference - the same
  // derived-not-synced-via-effect pattern selectedTimeSlot uses below, so
  // picking a valid date again naturally re-activates delivery.
  const cateringDeliveryAllowedForDate = showEventDate
    ? isCateringDeliveryAvailableForDate(dateForSlots)
    : true;
  const fridayDeliveryCutoff = showEventDate ? cateringDeliveryTimeCutoff(dateForSlots) : null;
  const effectiveFulfillmentMethod: FulfillmentMethod =
    fulfillmentMethod === "delivery" && !cateringDeliveryAllowedForDate ? "pickup" : fulfillmentMethod;

  // Catering "delivery" carries a NON-TAXABLE delivery fee, banded by the
  // customer's self-selected distance - shown as its own row and kept OUT
  // of the tax base, matching the order service charge Square receives
  // (`taxable: false`).
  const selectedDeliveryTier = getCateringDeliveryTier(deliveryDistanceTierId);
  const hasDeliveryFee =
    showEventDate && effectiveFulfillmentMethod === "delivery" && Boolean(selectedDeliveryTier);
  const deliveryFeeCents = selectedDeliveryTier?.feeCents ?? 0;
  const grandTotalCents = totalCents + salesTaxCents + deliveryFeeCents;

  const slots = useMemo(() => {
    const available = getAvailableSlots(dateForSlots, minLeadMinutes);
    // On a Friday catering delivery, only offer times at or before the
    // cutoff - the customer can't even select an invalid delivery time.
    if (effectiveFulfillmentMethod === "delivery" && fridayDeliveryCutoff) {
      return available.filter((slot) => slot.value <= fridayDeliveryCutoff.time);
    }
    return available;
  }, [dateForSlots, minLeadMinutes, effectiveFulfillmentMethod, fridayDeliveryCutoff?.time]);

  // Derived rather than synced via an effect: if the date changed and the
  // previously-picked slot is no longer in range, fall back to the first
  // available one for display/submission without a render-then-setState
  // round trip.
  const selectedTimeSlot = slots.some((slot) => slot.value === timeSlot) ? timeSlot : (slots[0]?.value ?? "");

  const minEventDate = showEventDate ? earliestDateForLeadTime(minLeadMinutes) : undefined;

  // Order Online: delivery lives on the Cash App / Square ordering profile
  // (or is temporarily disabled, see externalDeliveryHref's null case), so
  // when this prop is passed at all - string or null - the only in-form
  // method is pickup. Catering omits the prop entirely and uses in-form
  // delivery instead.
  const hasExternalDelivery = externalDeliveryHref !== undefined;

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
    if (effectiveFulfillmentMethod === "delivery" && !selectedDeliveryTier) {
      return setError("Please select how far you are from the restaurant.");
    }
    if (
      effectiveFulfillmentMethod === "delivery" &&
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
        fulfillmentMethod: effectiveFulfillmentMethod,
        address:
          effectiveFulfillmentMethod === "delivery"
            ? {
                addressLine1: addressLine1.trim(),
                addressLine2: addressLine2.trim() || undefined,
                city: city.trim(),
                state: state.trim(),
                postalCode: postalCode.trim(),
              }
            : undefined,
        deliveryDistanceTierId: effectiveFulfillmentMethod === "delivery" ? deliveryDistanceTierId : undefined,
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
              effectiveFulfillmentMethod === "pickup"
                ? "checkout-method-btn checkout-method-btn--active"
                : "checkout-method-btn"
            }
            onClick={() => setFulfillmentMethod("pickup")}
          >
            Pickup
          </button>
          {hasExternalDelivery ? (
            externalDeliveryHref ? (
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
                className="checkout-method-btn checkout-method-btn--disabled"
                disabled
                aria-disabled="true"
              >
                Delivery
              </button>
            )
          ) : (
            <button
              type="button"
              className={
                !cateringDeliveryAllowedForDate
                  ? "checkout-method-btn checkout-method-btn--disabled"
                  : effectiveFulfillmentMethod === "delivery"
                    ? "checkout-method-btn checkout-method-btn--active"
                    : "checkout-method-btn"
              }
              onClick={() => setFulfillmentMethod("delivery")}
              disabled={!cateringDeliveryAllowedForDate}
              aria-disabled={!cateringDeliveryAllowedForDate}
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
        ) : hasExternalDelivery ? (
          <p className="checkout-help">
            Delivery is temporarily unavailable &mdash; please choose pickup, or check back soon.
          </p>
        ) : !cateringDeliveryAllowedForDate ? (
          <p className="checkout-help">
            Delivery isn&rsquo;t available for a Saturday or Sunday event date &mdash; catering
            delivery runs Monday&ndash;Friday, with Friday deliveries only until{" "}
            {CATERING_DELIVERY_FRIDAY_CUTOFF_LABEL} Pacific. Choose Pickup, or pick a weekday
            event date for delivery.
          </p>
        ) : effectiveFulfillmentMethod === "delivery" && deliveryHelpText ? (
          <p className="checkout-help">
            {deliveryHelpText}
            {fridayDeliveryCutoff ? (
              <>
                {" "}
                Friday catering deliveries are only available until {fridayDeliveryCutoff.label} Pacific
                &mdash; later times aren&rsquo;t shown below.
              </>
            ) : null}
          </p>
        ) : null}
      </div>

      {effectiveFulfillmentMethod === "delivery" ? (
        <>
          <div className="checkout-field">
            <label htmlFor="checkout-delivery-distance">How far are you from the restaurant?</label>
            <select
              id="checkout-delivery-distance"
              value={deliveryDistanceTierId}
              onChange={(e) => setDeliveryDistanceTierId(e.target.value)}
            >
              <option value="">Select distance&hellip;</option>
              {CATERING_DELIVERY_TIERS.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  {tier.label} &mdash; {formatMoney(tier.feeCents)}
                </option>
              ))}
            </select>
            <p className="checkout-help">
              Please choose your actual distance from the restaurant &mdash; misrepresenting
              it can mean the order is cancelled and a penalty charged. We do not deliver
              beyond {CATERING_DELIVERY_MAX_MILES} miles.
            </p>
          </div>
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
                  {CATERING_DELIVERY_FEE_NAME} (non-taxable) &mdash; {selectedDeliveryTier?.label}
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
            disabled={
              !agreedToTerms ||
              submitting ||
              slots.length === 0 ||
              (effectiveFulfillmentMethod === "delivery" && !selectedDeliveryTier)
            }
          >
            <span>{submitting ? "Redirecting to payment..." : submitLabel}</span>
            <span>{formatMoney(grandTotalCents)}</span>
          </button>
        </>
      )}
    </form>
  );
}
