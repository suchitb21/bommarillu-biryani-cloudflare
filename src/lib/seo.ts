/**
 * Single source of truth for the site's public identity - the domain,
 * business name/address/phone, and social links. Used by the root layout's
 * metadata + JSON-LD, and by sitemap.ts / robots.ts, so none of these can
 * drift out of sync with each other.
 *
 * Client + server safe (no "server-only" import).
 */

/** The production domain search engines should index - never the .vercel.app
 * preview URL, even though that is what this app is deployed to today. */
export const SITE_URL = "https://www.bommarillubiryani.com";

export const SITE_NAME = "Bommarillu Biryani";

export const BUSINESS = {
  name: SITE_NAME,
  telephone: "+14259996271",
  telephoneDisplay: "+1 425-999-6271",
  streetAddress: "17020 Avondale Way",
  addressLocality: "Redmond",
  addressRegion: "WA",
  postalCode: "98052",
  addressCountry: "US",
};

export const SOCIAL_LINKS = {
  instagram: "https://www.instagram.com/bommarillubiryani?stkn=Mm94ZGhlYTFkY2tz",
};
