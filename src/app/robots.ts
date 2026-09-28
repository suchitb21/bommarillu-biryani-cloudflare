import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Staff-only and transactional/checkout paths carry no search value and
      // /admin must never surface in search results regardless of the noindex
      // meta tag already on those pages - belt and suspenders.
      disallow: ["/admin", "/api", "/cart", "/order-confirmation"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
