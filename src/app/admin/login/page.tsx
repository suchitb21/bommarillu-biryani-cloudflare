import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/admin-login-form";
import "../admin.css";

export const metadata: Metadata = {
  title: "Admin sign in · Bommarillu Biryani",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="admin-login-wrap">
      <div className="admin-login-card">
        <h1>Bommarillu Admin</h1>
        <p>Enter the staff password to continue.</p>
        <AdminLoginForm />
      </div>
    </div>
  );
}
