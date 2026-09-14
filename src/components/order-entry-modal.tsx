"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import "./order-entry-modal.css";
import { DELIVERY_ORDERING_URL } from "@/lib/delivery";

// Once per browser session: picking an option or "just browsing" dismisses
// it until the next session, so it never nags a returning visitor.
export const DISMISS_KEY = "bommarillu-order-entry-dismissed";

// Fired when the visitor dismisses the modal and is staying on the page (vs.
// navigating away via Order Online/Catering) - lets the page defer loading
// heavy hero media until it knows it's actually needed.
export const ORDER_ENTRY_DISMISSED_EVENT = "order-entry:dismissed";

// No-op subscription: the modal only needs "are we on the client yet?" as a
// one-way latch (server snapshot false -> client snapshot true) so it can
// read sessionStorage and render after hydration without calling setState
// from an effect.
function noopSubscribe(): () => void {
  return () => {};
}

function readDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    // sessionStorage unavailable - just show it.
    return false;
  }
}

/**
 * First-choice popup on the home page: Order Online vs Catering, and - for
 * Order Online - Pickup (this site) vs Delivery (redirected to the
 * restaurant's Square/Cash App ordering profile, the only surface that can
 * actually dispatch a courier). See src/lib/delivery.ts and design.md.
 */
export function OrderEntryModal() {
  const router = useRouter();
  const [step, setStep] = useState<"order-type" | "online">("order-type");
  const [dismissed, setDismissed] = useState<boolean>(readDismissed);

  // false during SSR and during hydration, true on the first client render
  // after hydration - so sessionStorage is only read client-side.
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const open = isClient && !dismissed;

  const dismiss = useCallback(() => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Ignore write failures.
    }
    setDismissed(true);
    window.dispatchEvent(new Event(ORDER_ENTRY_DISMISSED_EVENT));
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
