"use client";

import { useEffect, useState } from "react";
import "./contact.css";

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const HOURS_DATA = [
  { shifts: [[11, 0, 15, 0], [16, 0, 22, 0]], label: "11:00 AM – 3:00 PM & 4:00 PM – 10:00 PM" }, // Sun
  { shifts: [[11, 0, 14, 30], [16, 30, 21, 45]], label: "11:00 AM – 2:30 PM & 4:30 PM – 9:45 PM" }, // Mon
  { shifts: [[11, 0, 14, 30], [16, 30, 21, 45]], label: "11:00 AM – 2:30 PM & 4:30 PM – 9:45 PM" }, // Tue
  { shifts: [[11, 0, 14, 30], [16, 30, 21, 45]], label: "11:00 AM – 2:30 PM & 4:30 PM – 9:45 PM" }, // Wed
  { shifts: [[11, 0, 14, 30], [16, 30, 21, 45]], label: "11:00 AM – 2:30 PM & 4:30 PM – 9:45 PM" }, // Thu
  { shifts: [[11, 0, 15, 0], [16, 0, 22, 0]], label: "11:00 AM – 3:00 PM & 4:00 PM – 10:00 PM" }, // Fri
  { shifts: [[11, 0, 15, 0], [16, 0, 22, 0]], label: "11:00 AM – 3:00 PM & 4:00 PM – 10:00 PM" }, // Sat
];

const HOURS_ROWS = [
  { day: "Sunday", times: ["11:00 AM – 3:00 PM", "4:00 PM – 10:00 PM"] },
  { day: "Monday", times: ["11:00 AM – 2:30 PM", "4:30 PM – 9:45 PM"] },
  { day: "Tuesday", times: ["11:00 AM – 2:30 PM", "4:30 PM – 9:45 PM"] },
  { day: "Wednesday", times: ["11:00 AM – 2:30 PM", "4:30 PM – 9:45 PM"] },
  { day: "Thursday", times: ["11:00 AM – 2:30 PM", "4:30 PM – 9:45 PM"] },
  { day: "Friday", times: ["11:00 AM – 3:00 PM", "4:00 PM – 10:00 PM"] },
  { day: "Saturday", times: ["11:00 AM – 3:00 PM", "4:00 PM – 10:00 PM"] },
];

function getPacificNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const map: Record<string, string> = {};
  parts.forEach((p) => {
    map[p.type] = p.value;
  });
  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0;
  return {
    dayIdx: WEEKDAY_NAMES.indexOf(map.weekday),
    minutes: hour * 60 + parseInt(map.minute, 10),
  };
}

export default function ContactPage() {
  const [status, setStatus] = useState<{ dayIdx: number; isOpen: boolean } | null>(null);

  useEffect(() => {
    const { dayIdx, minutes } = getPacificNow();
    const today = HOURS_DATA[dayIdx];
    const isOpen = today.shifts.some(([sh, sm, eh, em]) => {
      const start = sh * 60 + sm;
      const end = eh * 60 + em;
      return minutes >= start && minutes < end;
    });
    setStatus({ dayIdx, isOpen });
  }, []);

  const todayLabel = status ? HOURS_DATA[status.dayIdx].label : null;
  const badgeText = status ? (status.isOpen ? "Open Now" : "Closed Now") : "Checking hours…";
  const badgeClass = status ? (status.isOpen ? "is-open" : "is-closed") : "";

  return (
    <>
      <section className="contact-hero">
        <div className="dot dot--orange" style={{ width: 8, height: 8, top: "20%", left: "8%" }} />
        <div className="dot dot--ring" style={{ width: 16, height: 16, top: "65%", right: "10%" }} />
        <div className="dot dot--orange" style={{ width: 6, height: 6, top: "30%", right: "16%" }} />

        <div className="bs-heading">
          <svg viewBox="0 0 36 36" fill="none">
            <path d="M4 18c6-8 12-8 18 0M22 18c4-5 8-5 10-2" stroke="#f0821e" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="30" cy="12" r="2" fill="#f0821e" />
          </svg>
          <h2>
            Contact <span>Us</span>
          </h2>
          <svg viewBox="0 0 36 36" fill="none">
            <path d="M32 18c-6-8-12-8-18 0M14 18c-4-5-8-5-10-2" stroke="#f0821e" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="6" cy="12" r="2" fill="#f0821e" />
          </svg>
        </div>
        <p className="bs-sub">
          Have a question, feedback, or a group order in mind? Send us a message — we&rsquo;d love to hear from you.
        </p>
      </section>

      <section className="contact-form-section">
        <div className="contact-grid">
          <div className="form-card">
            <div className="form-row">
              <input className="form-field" type="email" placeholder="Email" style={{ marginBottom: 0 }} />
              <input className="form-field" type="tel" placeholder="Phone" style={{ marginBottom: 0 }} />
            </div>
            <input className="form-field" type="text" placeholder="Name" />
            <textarea className="form-field" placeholder="Message" />
            <button type="button" className="btn-pill form-submit-btn">
              Submit
            </button>
          </div>

          <div className="newsletter-card">
            <svg className="newsletter-leaf" viewBox="0 0 170 170" fill="none">
              <path
                d="M170 0C150 20 120 30 100 55C85 74 78 100 90 125C110 110 130 90 145 65C158 44 168 22 170 0Z"
                fill="#f0821e"
              />
              <path
                d="M150 10C130 30 105 45 90 68C110 60 132 48 150 30C160 20 165 12 150 10Z"
                fill="#f0821e"
              />
            </svg>
            <h3>Our Newsletters</h3>
            <p>
              Be the first to know about new menu items, weekend specials, and
              exclusive offers — straight to your inbox.
            </p>
            <input className="newsletter-field" type="email" placeholder="Email" />
            <button type="button" className="newsletter-submit-btn">
              Submit
            </button>
          </div>
        </div>
      </section>

      <section className="info-section">
        <div className="dot dot--orange" style={{ width: 7, height: 7, top: "8%", left: "6%" }} />
        <div className="dot dot--ring" style={{ width: 16, height: 16, top: "6%", right: "9%" }} />

        <div className="bs-heading">
          <svg viewBox="0 0 36 36" fill="none">
            <path d="M4 18c6-8 12-8 18 0M22 18c4-5 8-5 10-2" stroke="#f0821e" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="30" cy="12" r="2" fill="#f0821e" />
          </svg>
          <h2>
            Get In <span>Touch</span>
          </h2>
          <svg viewBox="0 0 36 36" fill="none">
            <path d="M32 18c-6-8-12-8-18 0M14 18c-4-5-8-5-10-2" stroke="#f0821e" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="6" cy="12" r="2" fill="#f0821e" />
          </svg>
        </div>
        <p className="bs-sub">Reach out directly, or stop by — here&rsquo;s everything you need to find us.</p>

        <div className="info-grid">
          <div className="info-card info-card--phone">
            <div className="info-card-icon">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1L6.6 10.8Z"
                  stroke="#fff"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3>+1 425-420-0160</h3>
            <p>Call us for orders, catering, or any questions.</p>
          </div>

          <div className="info-card info-card--address">
            <div className="info-card-icon">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 22s7-7.2 7-12.5S16.4 2 12 2 5 4.9 5 9.5 12 22 12 22Z"
                  stroke="#fff"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="9.5" r="2.5" stroke="#fff" strokeWidth="1.7" />
              </svg>
            </div>
            <h3>17020 Avondale Way, Redmond, WA 98052</h3>
            <p>Stop by for dine-in, pickup, or takeout.</p>
          </div>

          <div className="info-card info-card--hours">
            <div className="info-card-icon">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="1.7" />
                <path d="M12 7v5l3.5 2" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className={`hours-badge ${badgeClass}`}>{badgeText}</span>
            <h3>Today&rsquo;s Hours</h3>
            <p>{todayLabel ?? "Loading today's hours…"}</p>
          </div>
        </div>

        <details className="hours-card">
          <summary className="hours-summary">
            <span className="hours-summary-left">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#3b2417" strokeWidth="1.7" />
                <path d="M12 7v5l3.5 2" stroke="#3b2417" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Hours of Operation
            </span>
            <span className="hours-summary-right">
              <span className={`hours-badge ${badgeClass}`}>{badgeText}</span>
              <span className="hours-summary-today">
                {status ? `Today (${WEEKDAY_NAMES[status.dayIdx]}): ${todayLabel}` : "Loading today's hours…"}
              </span>
              <span className="hours-toggle-icon">+</span>
            </span>
          </summary>

          <div className="hours-body">
            {HOURS_ROWS.map((row, i) => (
              <div className={`hours-row${status?.dayIdx === i ? " today" : ""}`} key={row.day}>
                <span className="hours-day">
                  {row.day} <span className="today-tag">Today</span>
                </span>
                <span className="hours-times">
                  {row.times[0]}
                  <br />
                  {row.times[1]}
                </span>
              </div>
            ))}
          </div>
        </details>
      </section>

      <section className="map-section">
        <div className="dot dot--orange" style={{ width: 7, height: 7, top: "10%", left: "8%" }} />
        <div className="dot dot--ring" style={{ width: 16, height: 16, top: "8%", right: "10%" }} />

        <div className="bs-heading">
          <svg viewBox="0 0 36 36" fill="none">
            <path d="M4 18c6-8 12-8 18 0M22 18c4-5 8-5 10-2" stroke="#f0821e" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="30" cy="12" r="2" fill="#f0821e" />
          </svg>
          <h2>
            Find <span>Us</span>
          </h2>
          <svg viewBox="0 0 36 36" fill="none">
            <path d="M32 18c-6-8-12-8-18 0M14 18c-4-5-8-5-10-2" stroke="#f0821e" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="6" cy="12" r="2" fill="#f0821e" />
          </svg>
        </div>
        <p className="bs-sub">
          Right on Avondale Way in Redmond — pan the map below or get turn-by-turn directions.
        </p>

        <div className="map-card">
          <iframe
            src="https://www.google.com/maps?q=17020+Avondale+Way,+Redmond,+WA+98052&output=embed"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Map to Bommarillu Biryani, 17020 Avondale Way, Redmond, WA 98052"
          />
        </div>

        <div className="directions-wrap">
          <a
            className="btn-pill directions-btn"
            href="https://www.google.com/maps/dir/?api=1&destination=17020+Avondale+Way,+Redmond,+WA+98052"
            target="_blank"
            rel="noopener"
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M12 22s7-7.2 7-12.5S16.4 2 12 2 5 4.9 5 9.5 12 22 12 22Z"
                stroke="#fff"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="9.5" r="2.5" stroke="#fff" strokeWidth="1.8" />
            </svg>
            Get Directions
          </a>
        </div>
      </section>
    </>
  );
}
