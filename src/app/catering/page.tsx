import { MenuPage } from "@/components/menu-page";
import { CateringCartPanel } from "@/components/catering-cart-panel";
import { SQUARE_MENU_NAMES } from "@/lib/square/config";
import "./catering.css";

export default function CateringPage() {
  return (
    <>
      <MenuPage
        menuName={SQUARE_MENU_NAMES.catering}
        title="Catering"
        subtitle="Feeding a crowd? Order family-style trays and catering portions for your next event."
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
