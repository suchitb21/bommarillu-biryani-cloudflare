/**
 * Order Online "delivery" is intentionally NOT fulfilled on this site.
 *
 * Square's managed courier dispatch (DoorDash / Uber Eats / Nash) only runs
 * inside Square's own hosted ordering surfaces - creating a DELIVERY
 * fulfillment through the Orders API does not dispatch a courier (and is
 * gated to partner apps). So customers who want delivery are redirected to
 * the restaurant's online ordering profile (the `cash.app` storefront built
 * automatically from the catalog), where that dispatch is wired up and the
 * merchant already takes delivery orders.
 *
 * This site therefore handles: Order Online *pickup* (the "Menu" catalog,
 * full custom checkout) and Catering (the "Catering" catalog). Any
 * "delivery" intent surfaces this URL. See design.md.
 */
/**
 * Temporarily disabled (null) - the Cash App delivery link was pulled and a
 * replacement is coming shortly. Every call site below treats `null` as
 * "delivery exists as a concept but has no working link right now" and
 * greys out its own delivery button/note accordingly, rather than crashing
 * or silently falling back to an unsupported in-app delivery flow.
 *
 * To re-enable: paste the new URL back in as a string.
 */
export const DELIVERY_ORDERING_URL: string | null = null;
