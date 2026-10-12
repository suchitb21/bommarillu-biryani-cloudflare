import "./menu-page.css";
import { MenuSections } from "./menu-sections";
import { getMenuByName } from "@/lib/square/menu";
import type { CartSource } from "@/lib/cart/types";
import { applySoldOut } from "@/lib/sold-out/logic";
import { getActiveSoldOut } from "@/lib/sold-out/read";

// Shared between /order-online (the "Menu" Menu) and /catering (the
// "Catering" Menu) - only the menu name and header copy differ.
export async function MenuPage({
  menuName,
  title,
  subtitle,
  source,
  children,
}: {
  menuName: string;
  title: string;
  subtitle: string;
  source: CartSource;
  children?: React.ReactNode;
}) {
  let baseMenu;
  try {
    baseMenu = await getMenuByName(menuName);
  } catch (error) {
    return (
      <section className="menu-page">
        <div className="menu-page-inner">
          <p className="menu-page-error">
            We couldn&rsquo;t load the menu right now. Please try again shortly.
            {process.env.NODE_ENV !== "production" && (
              <>
                <br />
                {error instanceof Error ? error.message : String(error)}
              </>
            )}
          </p>
        </div>
      </section>
    );
  }

  const menu = applySoldOut(baseMenu, await getActiveSoldOut());

  return (
    <section className="menu-page">
      <div className="menu-page-inner">
        <div className="menu-page-header">
          <h1>{title}</h1>
          <p>{subtitle}</p>
          {children}
        </div>

        {menu.sections.length === 0 ? (
          <p className="menu-page-empty">This menu is empty right now. Please check back soon.</p>
        ) : (
          <MenuSections sections={menu.sections} source={source} />
        )}
      </div>
    </section>
  );
}
