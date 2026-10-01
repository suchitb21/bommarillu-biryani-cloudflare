"use client";

import { useState } from "react";
import type { AdminOrderView } from "@/lib/admin/types";

type AdminOrderTabsProps = {
  upcoming: AdminOrderView[];
  completed: AdminOrderView[];
  upcomingEmpty: string;
  completedEmpty: string;
};

type TabKey = "upcoming" | "completed";

/**
 * Purely presentational: both lists arrive pre-split and pre-formatted from a
 * server component, so toggling a tab never re-derives a date and can never
 * disagree with the server-rendered markup.
 */
export function AdminOrderTabs({
  upcoming,
  completed,
  upcomingEmpty,
  completedEmpty,
}: AdminOrderTabsProps) {
  const [tab, setTab] = useState<TabKey>("upcoming");

  const orders = tab === "upcoming" ? upcoming : completed;
  const emptyMessage = tab === "upcoming" ? upcomingEmpty : completedEmpty;

  return (
    <div>
      <div className="admin-tabs" role="tablist" aria-label="Order status">
        <button
          className="admin-tab"
          type="button"
          role="tab"
          aria-selected={tab === "upcoming"}
          onClick={() => setTab("upcoming")}
        >
          Upcoming Orders
          <span className="admin-tab-count">{upcoming.length}</span>
        </button>
        <button
          className="admin-tab"
          type="button"
          role="tab"
          aria-selected={tab === "completed"}
          onClick={() => setTab("completed")}
        >
          Completed Orders
          <span className="admin-tab-count">{completed.length}</span>
        </button>
      </div>

      {orders.length === 0 ? (
        <p className="admin-empty">{emptyMessage}</p>
      ) : (
        <div className="admin-order-list">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
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
