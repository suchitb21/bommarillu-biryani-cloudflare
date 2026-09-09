"use client";

import { useState } from "react";
import Link from "next/link";
import "./navbar.css";
import { useOrderOnlineCart } from "@/lib/cart/cart-context";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const cart = useOrderOnlineCart();

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
        <Link href="/cart" className="cart-link" aria-label={`Cart, ${cart.totalCount} items`}>
          <CartIcon />
          {cart.totalCount > 0 ? <span className="cart-badge">{cart.totalCount}</span> : null}
        </Link>
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

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="M3 4h2l1.6 10.4A2 2 0 0 0 8.58 16h8.84a2 2 0 0 0 1.98-1.7L20.5 8H6"
        stroke="#3b2417"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9.5" cy="20" r="1.3" fill="#3b2417" />
      <circle cx="17.5" cy="20" r="1.3" fill="#3b2417" />
    </svg>
  );
}
