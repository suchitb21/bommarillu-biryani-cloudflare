"use client";

import Link from "next/link";
import Image from "next/image";
import "./cart.css";
import { useOrderOnlineCart } from "@/lib/cart/cart-context";
import { lineTotalCents, type CartLine } from "@/lib/cart/types";
import { CheckoutForm, type CheckoutFormValues } from "@/components/checkout-form";
import type { OrderOnlineCheckoutRequest, CheckoutResponse } from "@/lib/checkout/types";
import { DELIVERY_ORDERING_URL } from "@/lib/delivery";

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default function CartPage() {
  const cart = useOrderOnlineCart();

  async function handleCheckout(values: CheckoutFormValues) {
    // Order Online is pickup-only on this site - delivery redirects to the
    // Cash App ordering page (externalDeliveryHref above), so the server is
    // only ever asked for a pickup.
    const body: OrderOnlineCheckoutRequest = {
      name: values.name,
      phone: values.phone,
      fulfillmentMethod: "pickup",
      timeSlot: values.timeSlot,
      lines: cart.lines,
    };

    const res = await fetch("/api/checkout/order-online", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data: CheckoutResponse = await res.json();
    if (!data.ok) throw new Error(data.error);
    window.location.href = data.url;
  }

  return (
    <section className="cart-page">
      <div className="cart-page-inner">
        <h1>Your Cart</h1>

        {cart.lines.length === 0 ? (
          <div className="cart-empty">
            <p>Your cart is empty.</p>
            <Link href="/order-online" className="cart-empty-link">
              Browse the menu
            </Link>
          </div>
        ) : (
          <>
            <ul className="cart-lines">
              {cart.lines.map((line) => (
                <CartLineRow key={line.lineId} line={line} />
              ))}
            </ul>

            <div className="cart-summary">
              <div className="cart-summary-row">
                <span>Subtotal</span>
                <span>{formatMoney(cart.totalCents)}</span>
              </div>
              <button type="button" className="cart-clear-btn" onClick={cart.clear}>
                Clear cart
              </button>
            </div>

            <CheckoutForm
              showEventDate={false}
              minLeadMinutes={20}
              externalDeliveryHref={DELIVERY_ORDERING_URL}
              submitLabel="Pay now"
              totalCents={cart.totalCents}
              onSubmit={handleCheckout}
            />
          </>
        )}
      </div>
    </section>
  );
}

function CartLineRow({ line }: { line: CartLine }) {
  const cart = useOrderOnlineCart();

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
