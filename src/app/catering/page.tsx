import { MenuPage } from "@/components/menu-page";
import { CateringCartPanel } from "@/components/catering-cart-panel";
import { SQUARE_MENU_NAMES } from "@/lib/square/config";

export default function CateringPage() {
  return (
    <>
      <MenuPage
        menuName={SQUARE_MENU_NAMES.catering}
        title="Catering"
        subtitle="Feeding a crowd? Order family-style trays and catering portions for your next event."
        source="catering"
      />
      <CateringCartPanel />
    </>
  );
}
