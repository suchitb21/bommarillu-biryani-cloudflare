"use client";

import { useState } from "react";
import Image from "next/image";
import "./catering-cart-panel.css";
import "@/app/cart/cart.css";
import { useCateringCart } from "@/lib/cart/cart-context";
import { lineTotalCents, type CartLine } from "@/lib/cart/types";
import { CheckoutForm, type CheckoutFormValues } from "./checkout-form";
import type { CateringCheckoutRequest, CheckoutResponse } from "@/lib/checkout/types";

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

// Lives on /catering (not a separate route) - the restaurant wanted the
// catering cart kept entirely on this page rather than sharing the
// Order Online cart/checkout, since a mixed order doesn't make sense here
// (see design.md).
export function CateringCartPanel() {
  const cart = useCateringCart();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"cart" | "checkout">("cart");

  if (cart.lines.length === 0) return null;

  async function handleCheckout(values: CheckoutFormValues) {
    const body: CateringCheckoutRequest = {
      name: values.name,
      phone: values.phone,
      fulfillmentMethod: values.fulfillmentMethod,
      address: values.address,
      eventDate: values.eventDate ?? "",
      timeSlot: values.timeSlot,
      lines: cart.lines,
    };

    const res = await fetch("/api/checkout/catering", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data: CheckoutResponse = await res.json();
    if (!data.ok) throw new Error(data.error);
    window.location.href = data.url;
  }

  return (
    <>
      <button
        type="button"
        className="catering-bar"
        onClick={() => {
          setOpen(true);
          setStep("cart");
        }}
      >
        <span>
          {cart.totalCount} item{cart.totalCount === 1 ? "" : "s"} &middot; {formatMoney(cart.totalCents)}
        </span>
        <span className="catering-bar-cta">View catering order &rarr;</span>
      </button>

      {open ? (
        <div
          className="catering-drawer-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="catering-drawer" role="dialog" aria-modal="true" aria-label="Catering order">
            <div className="catering-drawer-header">
              <h2>Catering Order</h2>
              <button
                type="button"
                className="catering-drawer-close"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="catering-drawer-scroll">
              {step === "cart" ? (
                <>
                  <ul className="cart-lines">
                    {cart.lines.map((line) => (
                      <CateringLineRow key={line.lineId} line={line} />
                    ))}
                  </ul>

                  <div className="cart-summary">
                    <div className="cart-summary-row">
                      <span>Subtotal</span>
                      <span>{formatMoney(cart.totalCents)}</span>
                    </div>
                    <button type="button" className="cart-clear-btn" onClick={cart.clear}>
                      Clear order
                    </button>
                  </div>

                  <button type="button" className="catering-continue-btn" onClick={() => setStep("checkout")}>
                    Continue to details
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="catering-back-btn" onClick={() => setStep("cart")}>
                    &larr; Back to order
                  </button>
                  <CheckoutForm
                    showEventDate
                    minLeadMinutes={24 * 60}
                    deliveryHelpText="Delivery for catering orders is arranged directly by our staff after you check out - we'll confirm details by phone."
                    submitLabel="Pay now"
                    totalCents={cart.totalCents}
                    onSubmit={handleCheckout}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function CateringLineRow({ line }: { line: CartLine }) {
  const cart = useCateringCart();

  return (
    <li className="cart-line">
      {line.imageUrl ? (
        <div className="cart-line-media">
          <Image src={line.imageUrl} alt={line.itemName} fill sizes="72px" />
        </div>
      ) : null}

      <div className="cart-line-body">
        <div className="cart-line-name">{line.itemName}</div>
        <div className="cart-line-variation">{line.variationName}</div>
        {line.modifiers.length > 0 ? (
          <div className="cart-line-modifiers">{line.modifiers.map((m) => m.name).join(", ")}</div>
        ) : null}
        <div className="cart-line-controls">
          <button
            type="button"
            onClick={() => cart.setQuantity(line.lineId, line.quantity - 1)}
            aria-label="Decrease quantity"
          >
            &minus;
          </button>
          <span>{line.quantity}</span>
          <button
            type="button"
            onClick={() => cart.setQuantity(line.lineId, line.quantity + 1)}
            aria-label="Increase quantity"
          >
            +
          </button>
          <button type="button" className="cart-line-remove" onClick={() => cart.removeLine(line.lineId)}>
            Remove
          </button>
        </div>
      </div>

      <div className="cart-line-total">{formatMoney(lineTotalCents(line))}</div>
    </li>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
