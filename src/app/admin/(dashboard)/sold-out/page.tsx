import Link from "next/link";
import { AdminNotice, describeError } from "@/components/admin-notice";
import { AdminSoldOutList } from "@/components/admin-sold-out-list";
import { SQUARE_MENU_NAMES } from "@/lib/square/config";
import { getMenuByName, type MenuView } from "@/lib/square/menu";
import { activeEntries, type SoldOutEntry } from "@/lib/sold-out/logic";
import { listAll } from "@/lib/sold-out/store";

const MENUS = [
  { key: "menu", label: "Menu", name: SQUARE_MENU_NAMES.onlineOrdering },
  { key: "catering", label: "Catering", name: SQUARE_MENU_NAMES.catering },
] as const;

export default async function AdminSoldOutPage({
  searchParams,
}: {
  searchParams: Promise<{ menu?: string; error?: string }>;
}) {
  const params = await searchParams;
  const current = MENUS.find((menu) => menu.key === params.menu) ?? MENUS[0];

  // Loading and JSX live in separate scopes: a try/catch around markup would
  // not catch render-time errors (same note as admin-orders-section.tsx).
  let menu: MenuView | null = null;
  let active: SoldOutEntry[] = [];
  let failure: unknown = null;

  try {
    [menu, active] = await Promise.all([
      getMenuByName(current.name),
      // Straight from the table, not the 30 s cache: staff must see their own
      // change immediately.
      listAll().then((rows) => activeEntries(rows, new Date())),
    ]);
  } catch (error) {
    failure = error;
    console.error("[admin] Failed to load the sold-out list:", error);
  }

  return (
    <>
      <h1 className="admin-page-title">Sold Out</h1>
      <p className="admin-page-sub">
        Mark a menu group or a single item as sold out. Customers see it greyed out and
        can&apos;t order it. &ldquo;Today&rdquo; clears itself at midnight Pacific.
      </p>

      <nav className="admin-tabs" aria-label="Menu">
        {MENUS.map((entry) => (
          <Link
            key={entry.key}
            className="admin-tab"
            href={entry.key === "menu" ? "/admin/sold-out" : `/admin/sold-out?menu=${entry.key}`}
            aria-current={entry.key === current.key ? "page" : undefined}
          >
            {entry.label}
          </Link>
        ))}
      </nav>

      {params.error ? <AdminNotice title="That didn't work" detail={params.error} /> : null}

      {menu ? (
        <AdminSoldOutList menu={menu} menuName={current.name} active={active} />
      ) : (
        <AdminNotice title="Couldn't load the menu" detail={describeError(failure)} />
      )}
    </>
  );
}
