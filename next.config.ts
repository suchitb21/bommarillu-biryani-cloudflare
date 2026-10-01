import type { NextConfig } from "next";

/**
 * Baseline security headers, applied to every response.
 *
 * There is deliberately NO Content-Security-Policy here. This site embeds a
 * Google Maps iframe on /contact and loads Vercel Analytics + Speed Insights,
 * so a plausible-looking CSP would silently break one of them. Doing it
 * properly needs the full list of origins actually in use and a report-only
 * rollout first - worth its own change rather than a guess.
 */
const securityHeaders = [
  // Stops the site being framed, which is what makes a clickjacked login page
  // (an invisible iframe over the admin form) possible.
  { key: "X-Frame-Options", value: "DENY" },
  // Don't let browsers sniff a different content type than we declared.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send the origin cross-site but never full paths, so admin URLs and order
  // references do not leak through referrers.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // This site genuinely needs none of these.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  // Two years. Deliberately without includeSubDomains: the apex is still served
  // by a different host, and committing every subdomain to HTTPS is not
  // something to do from this config.
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "items-images-production.s3.us-west-2.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "items-images-sandbox.s3.us-west-2.amazonaws.com",
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      // The old Square-hosted site used /home; this one serves the home page
      // at /. A 301 here tells Google to transfer that old listing's SEO
      // value to / instead of leaving it pointing at a dead page.
      { source: "/home", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
