import { getWeeklyHours } from "@/lib/time-slots";
import { BUSINESS, SITE_NAME, SITE_URL, SOCIAL_LINKS } from "@/lib/seo";

const SCHEMA_WEEKDAYS = [
  "https://schema.org/Sunday",
  "https://schema.org/Monday",
  "https://schema.org/Tuesday",
  "https://schema.org/Wednesday",
  "https://schema.org/Thursday",
  "https://schema.org/Friday",
  "https://schema.org/Saturday",
];

function minutesToHHmm(minutesOfDay: number): string {
  const hour = Math.floor(minutesOfDay / 60);
  const minute = minutesOfDay % 60;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

/**
 * Restaurant/LocalBusiness JSON-LD, rendered once in the root layout so every
 * page carries the same business identity for search engines. Opening hours
 * are derived from the same booking timetable the checkout forms use
 * (see time-slots.ts), so this can never advertise hours the restaurant
 * does not actually keep.
 */
export function buildRestaurantSchema() {
  const openingHoursSpecification = getWeeklyHours().flatMap((day, weekday) =>
    day.windows.map((window) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: SCHEMA_WEEKDAYS[weekday],
      opens: minutesToHHmm(window.start),
      closes: minutesToHHmm(window.end),
    }))
  );

  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: SITE_NAME,
    url: SITE_URL,
    image: [`${SITE_URL}/opengraph-image.jpg`],
    telephone: BUSINESS.telephone,
    priceRange: "$$",
    servesCuisine: ["Indian", "Biryani", "Hyderabadi"],
    acceptsReservations: "False",
    menu: `${SITE_URL}/order-online`,
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.streetAddress,
      addressLocality: BUSINESS.addressLocality,
      addressRegion: BUSINESS.addressRegion,
      postalCode: BUSINESS.postalCode,
      addressCountry: BUSINESS.addressCountry,
    },
    sameAs: [SOCIAL_LINKS.instagram],
    openingHoursSpecification,
  };
}
