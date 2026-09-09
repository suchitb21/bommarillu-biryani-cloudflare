import { MenuPage } from "@/components/menu-page";
import { SQUARE_MENU_NAMES } from "@/lib/square/config";

export default function OrderOnlinePage() {
  return (
    <MenuPage
      menuName={SQUARE_MENU_NAMES.onlineOrdering}
      title="Order Online"
      subtitle="Browse the full menu and place your order for pickup or delivery."
      source="menu"
    />
  );
}
