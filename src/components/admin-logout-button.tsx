"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLogoutButton() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // Even if the call fails, send them to the login page - the proxy will
      // bounce them straight back if the cookie is somehow still valid.
    }
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <button
      className="admin-btn admin-btn--ghost"
      type="button"
      onClick={handleSignOut}
      disabled={signingOut}
    >
      {signingOut ? "Signing out…" : "Sign out"}
    </button>
  );
}
