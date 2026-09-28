import type { Metadata } from "next";
import Link from "next/link";
import "./system-pages.css";

/**
 * Rendered for any URL that does not match a route. Next returns a real 404
 * status for this, and adds `noindex` automatically, so unknown paths will not
 * be indexed even though crawlers will find them.
 */
export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <section className="system-page">
      <div className="system-page-card">
        <span className="system-page-kicker">404</span>
        <h1>We couldn&rsquo;t find that page</h1>
        <p>
          The link may be broken, or the page may have moved. Nothing is wrong
          with your order &mdash; the menu is still exactly where you left it.
        </p>
        <div className="system-page-actions">
          <Link className="system-page-btn" href="/">
            Back to home
          </Link>
          <Link
            className="system-page-btn system-page-btn--ghost"
            href="/order-online"
          >
            Order Online
          </Link>
        </div>
        <p className="system-page-help">
          Need a hand? Call us on{" "}
          <a href="tel:4254200160">425-420-0160</a>.
        </p>
      </div>
    </section>
  );
}
