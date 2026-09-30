"use client";

import Link, { type LinkProps } from "next/link";
import { useState, type AnchorHTMLAttributes, type ReactNode } from "react";

type HoverPrefetchLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    children: ReactNode;
  };

/**
 * Next.js prefetches every <Link> the moment it enters the viewport, which
 * floods low-value requests from a nav bar that renders on every page (most
 * visitors never click most of it). This defers prefetching until real
 * intent - hover or touch - per Next's own documented fix for this:
 * https://nextjs.org/docs/app/guides/prefetching#hover-triggered-prefetch
 */
export function HoverPrefetchLink({ children, ...rest }: HoverPrefetchLinkProps) {
  const [active, setActive] = useState(false);

  return (
    <Link {...rest} prefetch={active ? null : false} onMouseEnter={() => setActive(true)}>
      {children}
    </Link>
  );
}
