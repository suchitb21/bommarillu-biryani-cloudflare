import {
  AdminOrdersSection,
  type OrdersSectionParams,
} from "@/components/admin-orders-section";

export default async function AdminOnlineOrdersPage({
  searchParams,
}: {
  searchParams: Promise<OrdersSectionParams>;
}) {
  return (
    <AdminOrdersSection channel="order-online" params={await searchParams} />
  );
}
