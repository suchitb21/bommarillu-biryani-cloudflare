import { getPortalOrderSummary } from "@/lib/square/portal-orders";
import { AdminOrderTabs } from "@/components/admin-order-tabs";
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

export async function AdminOrdersSection({
  channel,
}: {
  channel: PortalChannel;
}) {
  const copy = COPY[channel];

  // Data loading and JSX are deliberately kept in separate scopes: React does
  // not render the JSX where the `try` sits, so a try/catch wrapped around
  // markup would not actually catch anything.
  let summary: PortalOrderSummary | null = null;
  let failure: unknown = null;

  try {
    summary = await getPortalOrderSummary(channel);
  } catch (error) {
    failure = error;
    console.error(`[admin] Failed to load ${channel} orders:`, error);
  }

  if (!summary) {
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

  const { upcoming, completed, skippedUnsettled, lookbackDays, scannedOrders } =
    summary;

  return (
    <>
      <h1 className="admin-page-title">{copy.title}</h1>
      <p className="admin-page-sub">{copy.subtitle}</p>

      <AdminOrderTabs
        upcoming={upcoming}
        completed={completed}
        upcomingEmpty={copy.upcomingEmpty}
        completedEmpty={copy.completedEmpty}
      />

      <p className="admin-footnote">
        Scanned {scannedOrders} Square order{scannedOrders === 1 ? "" : "s"} from
        the last {lookbackDays} days.
        {skippedUnsettled > 0
          ? ` ${skippedUnsettled} unpaid/abandoned checkout${
              skippedUnsettled === 1 ? "" : "s"
            } hidden.`
          : ""}
      </p>
    </>
  );
}
