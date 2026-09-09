"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "./order-entry-modal.css";
import { DELIVERY_ORDERING_URL } from "@/lib/delivery";

// Once per browser session: picking an option or "just browsing" dismisses
// it until the next session, so it never nags a returning visitor.
const DISMISS_KEY = "bommarillu-order-entry-dismissed";

/**
 * First-choice popup on the home page: Order Online vs Catering, and - for
 * Order Online - Pickup (this site) vs Delivery (redirected to the
 * restaurant's Square/Cash App ordering profile, the only surface that can
 * actually dispatch a courier). See src/lib/delivery.ts and design.md.
 */
export function OrderEntryModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"order-type" | "online">("order-type");

  useEffect(() => {
    // Client-only: never render on the server, and only if this session
    // hasn't already dismissed it.
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      // sessionStorage unavailable - just show it.
    }
    setOpen(!dismissed);
  }, []);

  const dismiss = useCallback(() => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Ignore write failures.
    }
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, dismiss]);

  function go(path: string) {
    router.push(path);
  }

  function goDelivery() {
    // Redirect (same tab) to the ordering profile's delivery surface.
    window.location.assign(DELIVERY_ORDERING_URL);
  }

  if (!open) return null;

  return (
    <div className="order-entry-overlay" role="presentation">
      <div
        className="order-entry-modal"
        role="dialog"
        aria-modal="true"
        aria-label="How would you like to order?"
      >
        <button type="button" className="order-entry-close" onClick={dismiss} aria-label="Close">
          <CloseIcon />
        </button>

        {step === "order-type" ? (
          <>
            <span className="order-entry-kicker">Welcome to</span>
            <h2 className="order-entry-title">Bommarillu Biryani</h2>
            <p className="order-entry-sub">
              Layer by layer, sealed and slow-cooked the old way. How would you like to order?
            </p>

            <div className="order-entry-actions">
              <button type="button" className="order-entry-btn order-entry-btn--primary" onClick={() => setStep("online")}>
                Order Online
              </button>
              <button type="button" className="order-entry-btn" onClick={() => go("/catering")}>
                Catering
              </button>
            </div>

            <button type="button" className="order-entry-skip" onClick={dismiss}>
              Just browsing
            </button>
          </>
        ) : (
          <>
            <button type="button" className="order-entry-back" onClick={() => setStep("order-type")}>
              &larr; Back
            </button>
            <span className="order-entry-kicker">Order Online</span>
            <h2 className="order-entry-title">Pickup or delivery?</h2>
            <p className="order-entry-sub">
              Pickup is ordered right here. Delivery is handled on our ordering page so a
              courier can actually be dispatched - same menu and prices.
            </p>

            <div className="order-entry-actions">
              <button type="button" className="order-entry-btn order-entry-btn--primary" onClick={() => go("/order-online")}>
                Pickup on this site
              </button>
              <button type="button" className="order-entry-btn order-entry-btn--delivery" onClick={goDelivery}>
                Delivery
              </button>
            </div>

            <button type="button" className="order-entry-skip" onClick={dismiss}>
              Just browsing
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
