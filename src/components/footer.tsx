import { Fragment } from "react";
import Link from "next/link";
import { getWeeklyHours } from "@/lib/time-slots";
import "./footer.css";

/** Short day labels, indexed by JS weekday (0 = Sunday). */
const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The footer reads Monday-first, the way the restaurant thinks about its week.
 * Sunday sorts last because it shares its hours with nothing adjacent to it. */
const FOOTER_WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/**
 * Collapses runs of consecutive days that share the same hours into single rows
 * ("Mon–Thu ...", "Fri–Sat ..."). Derived from the booking timetable, so the
 * footer cannot advertise hours the ordering system will not honour.
 */
function buildHourGroups(): { days: string; ranges: string[] }[] {
  const hours = getWeeklyHours();
  const groups: {
    days: string;
    ranges: string[];
    firstDay: string;
    lastWeekday: number;
    label: string;
  }[] = [];

  for (const weekday of FOOTER_WEEK_ORDER) {
    const label = hours[weekday].label;
    const previous = groups[groups.length - 1];

    if (
      previous &&
      previous.label === label &&
      previous.lastWeekday + 1 === weekday
    ) {
      previous.days = `${previous.firstDay}\u2013${SHORT_DAYS[weekday]}`;
      previous.lastWeekday = weekday;
      continue;
    }

    groups.push({
      days: SHORT_DAYS[weekday],
      ranges: hours[weekday].ranges,
      firstDay: SHORT_DAYS[weekday],
      lastWeekday: weekday,
      label,
    });
  }

  return groups.map(({ days, ranges }) => ({ days, ranges }));
}

const HOUR_GROUPS = buildHourGroups();

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="logo">
            <img src="/logo.jpeg" alt="Bommarillu Indian Cuisine" className="logo-badge" />
          </div>
          <p>
            Layer by layer, sealed and slow-cooked the old way — handi-fresh
            basmati and a masala recipe passed down through generations.
          </p>
          <div className="footer-social">
            <a
              href="https://www.instagram.com/bommarillubiryani?stkn=Mm94ZGhlYTFkY2tz"
              aria-label="Instagram"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="5" stroke="#fbf3e3" strokeWidth="1.6" />
                <circle cx="12" cy="12" r="4" stroke="#fbf3e3" strokeWidth="1.6" />
                <circle cx="17.2" cy="6.8" r="1.1" fill="#fbf3e3" />
              </svg>
            </a>
            <a
              href="https://wa.me/14259996271"
              aria-label="WhatsApp"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.7-1.2A9 9 0 1 0 12 3Z"
                  stroke="#fbf3e3"
                  strokeWidth="1.6"
                />
                <path
                  d="M8.5 8.5c0 4 3 7 7 7 .8 0 1-.4 1-1v-1.2l-2.2-.8-.8 1c-1.2-.5-2.5-1.8-3-3l1-.8-.8-2.2H8.5Z"
                  fill="#fbf3e3"
                />
              </svg>
            </a>
          </div>
        </div>

        <div className="footer-col">
          <h4>Explore</h4>
          <Link href="/">Home</Link>
          <Link href="/#menu">Menu</Link>
          <Link href="/catering">Catering</Link>
          <Link href="/about-us">About Us</Link>
          <Link href="/contact">Contact Us</Link>
        </div>

        <div className="footer-col">
          <h4>Visit Us</h4>
          <div className="footer-hours">
            <span className="footer-hours-title">Open (Pacific)</span>
            {HOUR_GROUPS.map((group, groupIndex) => (
              <Fragment key={group.days}>
                {groupIndex > 0 && <br />}
                {group.days} {group.ranges[0] ?? "Closed"}
                {group.ranges.slice(1).map((range) => (
                  <Fragment key={range}>
                    ,<br />
                    &ensp;{range}
                  </Fragment>
                ))}
              </Fragment>
            ))}
          </div>
          <Link href="/#faq">Common Questions</Link>
        </div>

        <div className="footer-col">
          <h4>Order</h4>
          <div className="footer-order-buttons">
            <Link className="footer-order-btn" href="/order-online">
              Order Online
            </Link>
            <Link className="footer-order-btn" href="/catering">
              Catering
            </Link>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span>&copy; 2026 Bommarillu Biryani. All rights reserved.</span>
        <span className="footer-bottom-links">
          <Link href="/terms">Terms &amp; Conditions</Link>
          <Link href="/privacy">Privacy Policy</Link>
        </span>
        <span>Made with &hearts; for real dum biryani.</span>
      </div>
    </footer>
  );
}
