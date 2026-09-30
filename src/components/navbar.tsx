"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import "./navbar.css";
import { useOrderOnlineCart } from "@/lib/cart/cart-context";
import { HoverPrefetchLink } from "@/components/hover-prefetch-link";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const cart = useOrderOnlineCart();
  // Dark navbar only on the home page, to match its hero section - every
  // other page keeps the regular cream navbar.
  const isHome = usePathname() === "/";

  return (
    <header className={isHome ? "navbar navbar--dark" : "navbar"}>
      <HoverPrefetchLink href="/" className="logo">
        <img src="/logo.jpeg" alt="Bommarillu Indian Cuisine" className="logo-badge" />
      </HoverPrefetchLink>

      <div className="navbar-right">
        <nav
          className={`nav-links${open ? " open" : ""}`}
          id="navLinks"
          onClick={() => setOpen(false)}
        >
          <HoverPrefetchLink href="/">Home</HoverPrefetchLink>
          <HoverPrefetchLink href="/catering">Catering</HoverPrefetchLink>
          <HoverPrefetchLink href="/about-us">About Us</HoverPrefetchLink>
          <HoverPrefetchLink href="/contact">Contact</HoverPrefetchLink>
          <HoverPrefetchLink href="/order-online" className="btn-pill">
            Order Online
          </HoverPrefetchLink>
        </nav>

        <HoverPrefetchLink href="/cart" className="cart-link" aria-label={`Cart, ${cart.totalCount} items`}>
          <CartIcon />
          {cart.totalCount > 0 ? <span className="cart-badge">{cart.totalCount}</span> : null}
        </HoverPrefetchLink>

        <button
          className="hamburger"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </header>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="M3 4h2l1.6 10.4A2 2 0 0 0 8.58 16h8.84a2 2 0 0 0 1.98-1.7L20.5 8H6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9.5" cy="20" r="1.3" fill="currentColor" />
      <circle cx="17.5" cy="20" r="1.3" fill="currentColor" />
    </svg>
  );
}
