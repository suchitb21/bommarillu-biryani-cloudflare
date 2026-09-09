import "./confirmation.css";
import Link from "next/link";
import { getSquareClient } from "@/lib/square/client";

// Square redirects here after checkout regardless of whether payment
// actually succeeded - a customer can land on this URL without having
// completed payment, so this looks the order up and shows its real status
// rather than assuming success because the browser arrived here.
export default async function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;

  if (!orderId) {
    return (
      <ConfirmationCard
        variant="error"
        title="No order found"
        message="We couldn't find an order to confirm. If you completed a payment, please contact us and we'll verify it."
      />
    );
  }

  const status = await lookUpOrderStatus(orderId);

  return <ConfirmationCard variant={status.variant} title={status.title} message={status.message} orderId={orderId} />;
}

type OrderStatus = {
  variant: "paid" | "pending" | "error";
  title: string;
  message: string;
};

// Kept separate from the component body so no JSX is ever constructed
// inside the try/catch itself (React can't catch rendering errors that way -
// only the data lookup needs the try/catch here).
async function lookUpOrderStatus(orderId: string): Promise<OrderStatus> {
  try {
    const client = getSquareClient();
    const { order } = await client.orders.get({ orderId });

    if (!order) {
      return {
        variant: "error",
        title: "Order not found",
        message: "We couldn't find that order. If you completed a payment, please contact us and we'll verify it.",
      };
    }

    const isPaid = order.netAmountDueMoney?.amount === BigInt(0) && (order.tenders?.length ?? 0) > 0;

    if (isPaid) {
      return {
        variant: "paid",
        title: "Order confirmed!",
        message:
          "Thanks for your order — we've got it and we're getting started. You'll be contacted if we need anything else.",
      };
    }

    return {
      variant: "pending",
      title: "Still processing...",
      message:
        "We're waiting on payment confirmation for this order. If you completed payment, this page will update shortly — no need to submit again.",
    };
  } catch (error) {
    console.error("Failed to look up order for confirmation:", error);
    return {
      variant: "error",
      title: "Couldn't verify this order",
      message:
        "Something went wrong looking up your order. If you completed a payment, please contact us and we'll verify it.",
    };
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
