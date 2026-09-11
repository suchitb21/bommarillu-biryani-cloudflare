/**
 * View models shared between the admin server components (which build them)
 * and the client components (which render them).
 *
 * Everything time- and money-related arrives here *already formatted* and in
 * Pacific time. The browser never re-derives a date, so the server-rendered
 * markup and the hydrated markup always agree.
 */

export type PortalChannel = "order-online" | "catering";

export type AdminOrderItemView = {
  name: string;
  quantity: number;
  totalLabel: string;
};

export type AdminOrderView = {
  id: string;
  referenceId: string;
  channel: PortalChannel;
  /** e.g. "Fri, Nov 14, 6:30 PM PT" - the event/pickup time. */
  scheduledLabel: string;
  /** e.g. "Mon, Nov 10, 9:12 AM PT" - when the order was placed. */
  createdLabel: string;
  customerName: string;
  customerPhone: string;
  fulfilmentLabel: string;
  isPaid: boolean;
  stateLabel: string;
  totalLabel: string;
  tipLabel: string | null;
  items: AdminOrderItemView[];
  note: string | null;
};

export type PortalOrderSummary = {
  upcoming: AdminOrderView[];
  completed: AdminOrderView[];
  /** Portal orders found but not yet paid (abandoned checkouts). */
  skippedUnsettled: number;
  /** How many days of Square history were scanned. */
  lookbackDays: number;
  /** Total orders Square returned in the window, before portal filtering. */
  scannedOrders: number;
};
