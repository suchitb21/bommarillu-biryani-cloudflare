"use client";

import { useEffect } from "react";
import Link from "next/link";
import "./system-pages.css";

/**
 * Catches errors thrown while rendering a page, so an unexpected failure shows
 * something branded and recoverable instead of Next's built-in error screen.
 *
 * Must be a Client Component - that is a Next.js requirement for error
 * boundaries. `reset` re-renders the segment, which is enough for transient
 * failures (a flaky upstream call, for instance).
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaces in the Vercel function logs with the digest, which is what
    // correlates this to the server-side stack trace.
    console.error("[app] Unhandled render error:", error);
  }, [error]);

  return (
    <section className="system-page">
      <div className="system-page-card">
        <span className="system-page-kicker">Something went wrong</span>
        <h1>We hit a snag</h1>
        <p>
          This one is on us, not you. Try again in a moment &mdash; if it keeps
          happening, give us a call and we&rsquo;ll take your order directly.
        </p>
        <div className="system-page-actions">
          <button
            type="button"
            className="system-page-btn"
            onClick={() => reset()}
          >
            Try again
          </button>
          <Link
            className="system-page-btn system-page-btn--ghost"
            href="/"
          >
            Back to home
          </Link>
        </div>
        <p className="system-page-help">
          Call us on <a href="tel:4254200160">425-420-0160</a>.
        </p>
      </div>
    </section>
  );
}
