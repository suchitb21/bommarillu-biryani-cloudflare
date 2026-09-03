"use client";

import { useState } from "react";
import Link from "next/link";
import "./navbar.css";

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="navbar">
      <div className="logo">
        <div className="logo-icon">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M4 11c0-4 3.5-7 8-7s8 3 8 7"
              stroke="#fbf3e3"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <rect x="3" y="11" width="18" height="2.2" rx="1.1" fill="#fbf3e3" />
            <path
              d="M5 14c0 3.5 3 6 7 6s7-2.5 7-6"
              stroke="#fbf3e3"
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

      <nav className={`nav-links${open ? " open" : ""}`} id="navLinks">
        <Link href="/">Home</Link>
        <Link href="/#menu">Menu</Link>
        <Link href="/catering">Catering</Link>
        <Link href="/about-us">About Us</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/order-online" className="btn-pill">
          Order Online
        </Link>
      </nav>

      <button
        className="hamburger"
        aria-label="Toggle menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
    </header>
  );
}
