import { MenuPage } from "@/components/menu-page";
import { StoreClock } from "@/components/store-clock";
import { SQUARE_MENU_NAMES } from "@/lib/square/config";
import { DELIVERY_ORDERING_URL } from "@/lib/delivery";

export default function OrderOnlinePage() {
  return (
    <>
      <StoreClock />
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
      <MenuPage
        menuName={SQUARE_MENU_NAMES.onlineOrdering}
        title="Order Online"
        subtitle="Browse the full menu and order pickup right here - or use the delivery link above for delivery."
        source="menu"
      />
    </>
  );
}
