import type { Metadata } from "next";
import { MenuPage } from "@/components/menu-page";
import { StoreClock } from "@/components/store-clock";
import { SQUARE_MENU_NAMES } from "@/lib/square/config";
import { DELIVERY_ORDERING_URL } from "@/lib/delivery";

export const metadata: Metadata = {
  title: "Order Online",
  description:
    "Order authentic Hyderabadi chicken, mutton, and veg biryani plus non-veg appetizers for pickup in Redmond, WA. Browse the full menu and order online.",
  alternates: { canonical: "/order-online" },
};

export default function OrderOnlinePage() {
  return (
    <>
      <StoreClock />
      {DELIVERY_ORDERING_URL ? (
        <div className="menu-page-delivery-note">
          <p>
            Want <strong>delivery</strong>? Orders are placed on our delivery
            ordering page so a courier can be dispatched &mdash; same menu and
            prices.&ensp;
            <a href={DELIVERY_ORDERING_URL} target="_blank" rel="noopener noreferrer">
              Order delivery here &rarr;
            </a>
          </p>
        </div>
      ) : (
        <div className="menu-page-delivery-note menu-page-delivery-note--disabled">
          <p>Delivery is temporarily unavailable &mdash; pickup is open as usual below.</p>
        </div>
      )}
      <MenuPage
        menuName={SQUARE_MENU_NAMES.onlineOrdering}
        title="Order Online"
        subtitle="Browse the full menu and order pickup right here. All mutton items on weekends only ( FRI - SAT - SUN )"
        source="menu"
      />
    </>
  );
}
