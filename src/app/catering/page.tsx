import type { Metadata } from "next";
import { MenuPage } from "@/components/menu-page";
import { CateringCartPanel } from "@/components/catering-cart-panel";
import { SQUARE_MENU_NAMES } from "@/lib/square/config";
import "./catering.css";

export const metadata: Metadata = {
  title: "Catering",
  description:
    "Book Hyderabadi-style biryani catering trays, non-veg appetizers, and curries for your next event in Redmond, WA. $500 minimum order, delivery available.",
  alternates: { canonical: "/catering" },
};

export default function CateringPage() {
  return (
    <>
      <MenuPage
        menuName={SQUARE_MENU_NAMES.catering}
        title="Catering"
        subtitle="Catering Order should be done atleast 2 hours prior ! All mutton items on weekends only ( FRI - SAT - SUN )"
        source="catering"
      >
        <div className="tray-guide">
          <div className="tray-guide-row">
            <span className="tray-guide-label">Half Tray</span>
            <span>Appetizer serves 10&ndash;12</span>
            <span>Biryani serves 8&ndash;10</span>
            <span>Curry serves 8&ndash;10</span>
          </div>
          <div className="tray-guide-row">
            <span className="tray-guide-label">Full Tray</span>
            <span>Appetizer serves 20&ndash;25</span>
            <span>Biryani serves 15&ndash;20</span>
            <span>Curry serves 20&ndash;25</span>
          </div>
        </div>
      </MenuPage>
      <CateringCartPanel />
    </>
  );
}
