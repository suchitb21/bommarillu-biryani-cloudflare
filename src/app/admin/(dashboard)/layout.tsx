import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "@/lib/admin/config";
import { verifySessionToken } from "@/lib/admin/session";
import { AdminLogoutButton } from "@/components/admin-logout-button";
import "../admin.css";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

/**
 * The authoritative auth check. `src/proxy.ts` already redirected anyone
 * unauthenticated, but a proxy matcher is easy to misconfigure, so the gate is
 * re-checked here where customer data is actually read.
 *
 * `verifySessionToken` returns false (rather than throwing) when SESSION_SECRET
 * or ADMIN_PASSWORD_HASH is missing, so a misconfigured deployment sends staff
 * to the login form instead of a stack trace.
 */
export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  if (!(await verifySessionToken(token))) {
    redirect("/admin/login");
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <Link href="/admin" className="admin-brand">
          Bommarillu <span>Admin</span>
        </Link>
        <AdminLogoutButton />
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
