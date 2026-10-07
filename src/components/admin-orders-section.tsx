import {
  getCompletedOnlineOrdersPage,
  getPortalOrderSummary,
  type CompletedOrdersPage,
} from "@/lib/square/portal-orders";
import { getOrderLookbackDays } from "@/lib/admin/config";
import {
  AdminOrderTabs,
  type OrderPagination,
  type OrderTabKey,
} from "@/components/admin-order-tabs";
import { AdminNotice, describeError } from "@/components/admin-notice";
import type { PortalChannel, PortalOrderSummary } from "@/lib/admin/types";

const COPY: Record<
  PortalChannel,
  {
    title: string;
    subtitle: string;
    upcomingEmpty: string;
    completedEmpty: string;
  }
> = {
  "order-online": {
    title: "Online Orders",
    subtitle:
      "Pickup orders placed through this website. Only orders created on this site are listed, and times are Pacific.",
    upcomingEmpty: "No upcoming online orders right now.",
    completedEmpty: "No completed online orders in this window.",
  },
  catering: {
    title: "Catering Orders",
    subtitle:
      "Catering orders booked through the catering page, listed by event date. Only orders created on this site are listed, and times are Pacific.",
    upcomingEmpty: "No upcoming catering orders right now.",
    completedEmpty: "No completed catering orders in this window.",
  },
};

const PAGE_SIZE = 25;

export type OrdersSectionParams = {
  tab?: string;
  page?: string;
  /** Online Completed only: createdAt of the oldest order on the page before. */
  before?: string;
  /** Online Completed only: createdAt of the newest order on the page after. */
  after?: string;
  /** Online Completed only: display-only page number carried through links. */
  p?: string;
};

function completedHref(
  basePath: string,
  cursor: { before?: string; after?: string },
  pageNumber: number
): string {
  const params = new URLSearchParams({ tab: "completed" });
  if (cursor.before) params.set("before", cursor.before);
  if (cursor.after) params.set("after", cursor.after);
  if (pageNumber > 1) params.set("p", String(pageNumber));
  return `${basePath}?${params.toString()}`;
}

export async function AdminOrdersSection({
  channel,
  params,
}: {
  channel: PortalChannel;
  params: OrdersSectionParams;
}) {
  const copy = COPY[channel];
  const basePath = channel === "catering" ? "/admin/catering" : "/admin/orders";
  const tab: OrderTabKey = params.tab === "completed" ? "completed" : "upcoming";

  // Online Completed is the one view that does not scan every order: it asks
  // Square for just the 25 it needs, so it stays fast as order history grows.
  // Everything else (Upcoming, and all of Catering) is unchanged.
  const pagedFromSquare = channel === "order-online" && tab === "completed";

  // Data loading and JSX are deliberately kept in separate scopes: React does
  // not render the JSX where the `try` sits, so a try/catch wrapped around
  // markup would not actually catch anything.
  let summary: PortalOrderSummary | null = null;
  let completedPage: CompletedOrdersPage | null = null;
  let failure: unknown = null;

  try {
    if (pagedFromSquare) {
      completedPage = await getCompletedOnlineOrdersPage({
        before: params.before,
        after: params.after,
        pageSize: PAGE_SIZE,
      });
    } else {
      summary = await getPortalOrderSummary(channel);
    }
  } catch (error) {
    failure = error;
    console.error(`[admin] Failed to load ${channel} orders:`, error);
  }

  if (!summary && !completedPage) {
    return (
      <>
        <h1 className="admin-page-title">{copy.title}</h1>
        <AdminNotice
          title="Couldn't load orders from Square"
          detail={describeError(failure)}
        />
      </>
    );
  }

  if (completedPage) {
    const parsedPage = Number.parseInt(params.p ?? "1", 10);
    const pageNumber = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    // Moving to the top of the list has no cursor, so its number resets to 1.
    const reachedTop = !completedPage.newerCursor;

    const pagination: OrderPagination = {
      mode: "cursor",
      pageNumber: reachedTop ? 1 : pageNumber,
      newerHref: completedPage.newerCursor
        ? completedHref(
            basePath,
            { after: completedPage.newerCursor },
            Math.max(1, pageNumber - 1)
          )
        : null,
      olderHref: completedPage.olderCursor
        ? completedHref(
            basePath,
            { before: completedPage.olderCursor },
            (reachedTop ? 1 : pageNumber) + 1
          )
        : null,
    };

    return (
      <>
        <h1 className="admin-page-title">{copy.title}</h1>
        <p className="admin-page-sub">{copy.subtitle}</p>

        <AdminOrderTabs
          basePath={basePath}
          tab="completed"
          orders={completedPage.orders}
          upcomingCount={null}
          completedCount={null}
          pagination={pagination}
          emptyMessage={copy.completedEmpty}
        />

        <p className="admin-footnote">
          Completed orders, newest first, from the last {getOrderLookbackDays()}{" "}
          days. Each page is loaded from Square on demand.
        </p>
      </>
    );
  }

  const { upcoming, completed, skippedUnsettled, unclassified, lookbackDays, scannedOrders } =
    summary!;

  const list = tab === "upcoming" ? upcoming : completed;
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  // Clamp rather than 404: a stale ?page=9 (orders were removed, or the URL was
  // hand-edited) should land on the last real page, not an empty one.
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Math.min(
    Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1),
    totalPages
  );

  return (
    <>
      <h1 className="admin-page-title">{copy.title}</h1>
      <p className="admin-page-sub">{copy.subtitle}</p>

      <AdminOrderTabs
        basePath={basePath}
        tab={tab}
        orders={list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)}
        upcomingCount={upcoming.length}
        completedCount={completed.length}
        pagination={{
          mode: "numbered",
          page,
          pageSize: PAGE_SIZE,
          total: list.length,
        }}
        emptyMessage={tab === "upcoming" ? copy.upcomingEmpty : copy.completedEmpty}
      />

      <p className="admin-footnote">
        Scanned {scannedOrders} of our Square order
        {scannedOrders === 1 ? "" : "s"} from the last {lookbackDays} days.
        {skippedUnsettled > 0
          ? ` ${skippedUnsettled} unpaid/abandoned checkout${
              skippedUnsettled === 1 ? "" : "s"
            } hidden.`
          : ""}
        {unclassified > 0
          ? ` ${unclassified} order${
              unclassified === 1 ? "" : "s"
            } could not be classified and appear on neither page.`
          : ""}
      </p>
    </>
  );
}
