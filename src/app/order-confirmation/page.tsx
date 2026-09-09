import "./confirmation.css";
import Link from "next/link";
import type { Square } from "square";
import { getSquareClient } from "@/lib/square/client";
import { findOrderByReferenceId } from "@/lib/square/order-lookup";

/**
 * Square redirects here only after a payment on its hosted checkout page
 * succeeds (failed/abandoned payments never redirect). How we find the order:
 *
 * 1. `orderId` query param - Square appends this in PRODUCTION after a
 *    successful payment. Preferred path when present.
 * 2. `ref` query param - we embed our own `bb-<uuid>` reference token in the
 *    redirect URL ourselves (see createCheckout), so we can always find the
 *    order - including in sandbox, where Square appends no parameters.
 *
 * Whichever way we found it, the real order state decides what's shown - the
 * page never assumes success just because the browser landed here.
 */
export default async function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; ref?: string }>;
}) {
  const { orderId, ref } = await searchParams;

  if (!orderId && !ref) {
    return (
      <ConfirmationCard
        variant="error"
        title="No order found"
        message="We couldn't find an order to confirm. If you completed a payment, please contact us and we'll verify it."
      />
    );
  }

  const resolved = orderId ? await lookupById(orderId) : await lookupByReference(ref!);

  if (resolved.kind === "error") {
    return (
      <ConfirmationCard
        variant="error"
        title="Couldn't verify this order"
        message="Something went wrong looking up your order. If you completed a payment, please contact us and we'll verify it."
        orderId={orderId}
      />
    );
  }

  if (resolved.kind === "not-found" || !resolved.order.id) {
    return (
      <ConfirmationCard
        variant="error"
        title="Order not found"
        message="We couldn't find that order. If you completed a payment, please contact us and we'll verify it."
        orderId={orderId}
      />
    );
  }

  const order = resolved.order;
  const isPaid =
    order.netAmountDueMoney?.amount === BigInt(0) && (order.tenders?.length ?? 0) > 0;

  if (isPaid) {
    return (
      <ConfirmationCard
        variant="paid"
        title="Order confirmed!"
        message="Thanks for your order — we've got it and we're getting started. You'll be contacted if we need anything else."
        orderId={order.id}
      />
    );
  }

  return (
    <ConfirmationCard
      variant="pending"
      title="Confirming payment..."
      message="Your order was placed and Square is confirming the payment. Refresh this page in a minute, or contact us if it doesn't update."
      orderId={order.id}
    />
  );
}

type OrderLookup =
  | { kind: "found"; order: Square.Order }
  | { kind: "not-found" }
  | { kind: "error" };

async function lookupById(orderId: string): Promise<OrderLookup> {
  try {
    const client = getSquareClient();
    const { order } = await client.orders.get({ orderId });
    return order ? { kind: "found", order } : { kind: "not-found" };
  } catch (error) {
    console.error("Failed to look up order for confirmation:", error);
    return { kind: "error" };
  }
}

async function lookupByReference(ref: string): Promise<OrderLookup> {
  try {
    const order = await findOrderByReferenceId(ref);
    return order ? { kind: "found", order } : { kind: "not-found" };
  } catch (error) {
    console.error("Failed to look up order by reference for confirmation:", error);
    return { kind: "error" };
  }
}

function ConfirmationCard({
  variant,
  title,
  message,
  orderId,
}: {
  variant: "paid" | "pending" | "error";
  title: string;
  message: string;
  orderId?: string;
}) {
  return (
    <section className="confirmation-page">
      <div className="confirmation-card">
        <div className={`confirmation-icon confirmation-icon--${variant}`}>
          <StatusIcon variant={variant} />
        </div>
        <h1>{title}</h1>
        <p>{message}</p>
        {orderId ? <p className="confirmation-order-id">Order reference: {orderId}</p> : null}
        <Link href="/" className="confirmation-home-link">
          Back to home
        </Link>
      </div>
    </section>
  );
}

function StatusIcon({ variant }: { variant: "paid" | "pending" | "error" }) {
  if (variant === "paid") {
    return (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
        <path d="M5 12l5 5 9-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (variant === "pending") {
    return (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
        <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
      <path d="M12 8v5M12 16.5v.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
