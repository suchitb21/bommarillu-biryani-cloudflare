import Link from "next/link";
import "./footer.css";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="logo">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 11c0-4 3.5-7 8-7s8 3 8 7"
                  stroke="#3b2417"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <rect x="3" y="11" width="18" height="2.2" rx="1.1" fill="#3b2417" />
                <path
                  d="M5 14c0 3.5 3 6 7 6s7-2.5 7-6"
                  stroke="#3b2417"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="logo-text">
              <span className="logo-name">Bommarillu</span>
              <span className="logo-sub">BIRYANI</span>
            </div>
          </div>
          <p>
            Layer by layer, sealed and slow-cooked the old way — handi-fresh
            basmati and a masala recipe passed down through generations.
          </p>
          <div className="footer-social">
            <a href="#" aria-label="Instagram">
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="5" stroke="#fbf3e3" strokeWidth="1.6" />
                <circle cx="12" cy="12" r="4" stroke="#fbf3e3" strokeWidth="1.6" />
                <circle cx="17.2" cy="6.8" r="1.1" fill="#fbf3e3" />
              </svg>
            </a>
            <a href="#" aria-label="Facebook">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M14 8.5h2V5.5h-2c-2 0-3.5 1.5-3.5 3.5v2H8.5v3H10.5V21h3v-7h2.2l0.8-3H13.5V9c0-.3.2-.5.5-.5Z"
                  fill="#fbf3e3"
                />
              </svg>
            </a>
            <a href="#" aria-label="WhatsApp">
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
            Mon 11 AM &ndash; 10 PM
            <br />
            Tue&ndash;Thu 11 AM &ndash; 2:30 PM,
            <br />
            &ensp;4:30 PM &ndash; 10 PM
            <br />
            Fri&ndash;Sat 11 AM &ndash; 10:45 PM
            <br />
            Sun 11 AM &ndash; 10 PM
          </div>
          <Link href="/#faq">Common Questions</Link>
        </div>

        <div className="footer-col">
          <h4>Order</h4>
          <Link className="footer-order-btn" href="/order-online">
            Order Online
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
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
