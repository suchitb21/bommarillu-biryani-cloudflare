import { AdminOrdersSection } from "@/components/admin-orders-section";

export default async function AdminCateringOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  return <AdminOrdersSection channel="catering" params={await searchParams} />;
}
