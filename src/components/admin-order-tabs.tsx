import Link from "next/link";
import type { AdminOrderView } from "@/lib/admin/types";

export type OrderTabKey = "upcoming" | "completed";

/**
 * "numbered": the server holds the whole list and slices it (Upcoming, and all
 * of Catering), so it knows the total and can offer Page X of Y.
 * "cursor": the server fetched just one page from Square (Online Completed),
 * so the total is unknown and it can only step to the newer/older neighbour.
 */
export type OrderPagination =
  | { mode: "numbered"; page: number; pageSize: number; total: number }
  | {
      mode: "cursor";
      pageNumber: number;
      newerHref: string | null;
      olderHref: string | null;
    };

type AdminOrderTabsProps = {
  basePath: string;
  tab: OrderTabKey;
  /** Orders for the current page only - the server slices before sending. */
  orders: AdminOrderView[];
  /** null when this view did not have to count them (see cursor mode). */
  upcomingCount: number | null;
  completedCount: number | null;
  pagination: OrderPagination;
  emptyMessage: string;
};

function hrefFor(basePath: string, tab: OrderTabKey, page: number): string {
  const params = new URLSearchParams();
  if (tab !== "upcoming") params.set("tab", tab);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/**
 * Server-rendered: the tab and page live in the URL (?tab=completed&page=2),
 * so only one page of orders is ever sent to the browser, and a refresh or a
 * bookmark lands on the same view. The lists arrive pre-sorted by date and
 * pre-formatted, so paging never re-derives a date.
 */
export function AdminOrderTabs({
  basePath,
  tab,
  orders,
  upcomingCount,
  completedCount,
  pagination,
  emptyMessage,
}: AdminOrderTabsProps) {
  return (
    <div>
      <nav className="admin-tabs" aria-label="Order status">
        <Link
          className="admin-tab"
          href={hrefFor(basePath, "upcoming", 1)}
          aria-current={tab === "upcoming" ? "page" : undefined}
        >
          Upcoming Orders
          {upcomingCount !== null && (
            <span className="admin-tab-count">{upcomingCount}</span>
          )}
        </Link>
        <Link
          className="admin-tab"
          href={hrefFor(basePath, "completed", 1)}
          aria-current={tab === "completed" ? "page" : undefined}
        >
          Completed Orders
          {completedCount !== null && (
            <span className="admin-tab-count">{completedCount}</span>
          )}
        </Link>
      </nav>

      {orders.length === 0 ? (
        <p className="admin-empty">{emptyMessage}</p>
      ) : (
        <div className="admin-order-list">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}

      <Pager basePath={basePath} tab={tab} pagination={pagination} />
    </div>
  );
}

function Pager({
  basePath,
  tab,
  pagination,
}: {
  basePath: string;
  tab: OrderTabKey;
  pagination: OrderPagination;
}) {
  let prevHref: string | null;
  let nextHref: string | null;
  let label: string;
  let range: string | null = null;

  if (pagination.mode === "numbered") {
    const { page, pageSize, total } = pagination;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (totalPages <= 1) return null;

    prevHref = page > 1 ? hrefFor(basePath, tab, page - 1) : null;
    nextHref = page < totalPages ? hrefFor(basePath, tab, page + 1) : null;
    label = `Page ${page} of ${totalPages}`;
    range = `Orders ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`;
  } else {
    prevHref = pagination.newerHref;
    nextHref = pagination.olderHref;
    if (!prevHref && !nextHref) return null;
    label = `Page ${pagination.pageNumber}`;
    range = pagination.pageNumber === 1 ? "Newest orders" : null;
  }

  return (
    <nav className="admin-pagination" aria-label="Pagination">
      {prevHref ? (
        <Link className="admin-page-btn" href={prevHref} rel="prev">
          &larr; {pagination.mode === "cursor" ? "Newer" : "Previous"}
        </Link>
      ) : (
        <span className="admin-page-btn admin-page-btn--disabled">
          &larr; {pagination.mode === "cursor" ? "Newer" : "Previous"}
        </span>
      )}
      <span className="admin-page-info">
        {label}
        {range && <span className="admin-page-range">{range}</span>}
      </span>
      {nextHref ? (
        <Link className="admin-page-btn" href={nextHref} rel="next">
          {pagination.mode === "cursor" ? "Older" : "Next"} &rarr;
        </Link>
      ) : (
        <span className="admin-page-btn admin-page-btn--disabled">
          {pagination.mode === "cursor" ? "Older" : "Next"} &rarr;
        </span>
      )}
    </nav>
  );
}

function OrderCard({ order }: { order: AdminOrderView }) {
  const isDelivery = order.fulfilmentLabel === "Catering delivery";

  return (
    <article
      className={`admin-order-card${isDelivery ? " admin-order-card--delivery" : ""}`}
    >
      <div className="admin-order-top">
        <div>
          <p className="admin-order-when">{order.scheduledLabel}</p>
          <p className="admin-order-meta">
            {order.customerName} · {order.customerPhone}
          </p>
          <p className="admin-order-meta">Placed {order.createdLabel}</p>
        </div>
        <div className="admin-order-total">
          {order.totalLabel}
          {order.tipLabel && (
            <div className="admin-order-meta">incl. {order.tipLabel} tip</div>
          )}
        </div>
      </div>

      <div className="admin-badges">
        <span
          className={`admin-badge${isDelivery ? " admin-badge--delivery" : ""}`}
        >
          {order.fulfilmentLabel}
        </span>
        <span className="admin-badge">{order.stateLabel}</span>
        <span
          className={`admin-badge ${order.isPaid ? "admin-badge--paid" : "admin-badge--unpaid"}`}
        >
          {order.isPaid ? "Paid" : "Not paid"}
        </span>
      </div>

      {order.items.length > 0 && (
        <ul className="admin-order-items">
          {order.items.map((item, index) => (
            <li key={`${item.name}-${index}`}>
              <span>
                <span className="qty">{item.quantity}×</span>
                {item.name}
              </span>
              <span>{item.totalLabel}</span>
            </li>
          ))}
        </ul>
      )}

      {isDelivery && (
        <div className="admin-order-delivery">
          <p className="admin-order-meta">
            Distance: {order.deliveryDistanceLabel ?? "—"}
          </p>
          <p className="admin-order-meta">
            Deliver to: {order.deliveryAddress ?? "—"}
          </p>
        </div>
      )}

      {order.channel === "catering" && (
        <p className="admin-order-meta">
          Special instructions: {order.specialInstructions}
        </p>
      )}

      {order.note && <p className="admin-order-note">{order.note}</p>}
    </article>
  );
}
