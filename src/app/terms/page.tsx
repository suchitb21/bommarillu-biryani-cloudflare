import "../legal.css";

export const metadata = {
  title: "Terms & Conditions",
  description: "Terms and conditions for ordering from Bommarillu Biryani.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <section className="legal-page">
      <div className="legal-page-header">
        <span className="legal-kicker">Good to know</span>
        <h1>Terms &amp; Conditions</h1>
        <p>Bommarillu Biryani &middot; 17020 Avondale Way, Redmond, WA 98052 &middot; +1 425-999-6271</p>
      </div>
      <p className="legal-updated">Last updated: 2026</p>

      <p>
        These Terms &amp; Conditions (&ldquo;Terms&rdquo;) apply when you use this website
        and place an order with Bommarillu Biryani (&ldquo;we,&rdquo; &ldquo;us,&rdquo;
        &ldquo;the restaurant&rdquo;). By placing an order, you agree to these Terms. If
        you do not agree, please do not place an order and call us instead.
      </p>

      <h2>1. Orders and acceptance</h2>
      <ul>
        <li>
          Our online Order Online (pickup) and Catering ordering are available only while
          the restaurant is open, in line with the operating hours shown in our footer and
          on the website. Online pickup orders are for the current day and need roughly 20
          minutes&rsquo; lead time. Catering orders need at least 2 hours&rsquo; notice and
          a chosen event time that falls inside our operating hours. This 2-hour minimum
          is strictly the time we need to prepare a catering order &mdash; it does
          <strong> not</strong> include delivery time. If you choose delivery for a
          catering order, please plan for additional time on top of the 2-hour prep
          window so the food arrives by your event time.
        </li>
        <li>
          The menu and prices are set by the restaurant and may change at any time without
          notice. An order is accepted only when Square confirms it has been created and
          paid; we may decline or cancel any order, including where an order appears to be
          fraudulent, automated, abusive, or based on incorrect information.
        </li>
        <li>
          All items are shown as they exist in our catalog at the time of ordering. In
          rare cases an item may be unavailable; we will contact you using the phone
          number you provided if we need to substitute or cancel part of an order.
        </li>
      </ul>

      <h2>2. Prices, payment and tips</h2>
      <ul>
        <li>All prices are in US dollars.</li>
        <li>
          Orders placed on this website are paid online through Square&rsquo;s secure
          hosted checkout. A 10.4% sales tax is applied to food items at checkout.
        </li>
        <li>
          Catering orders have a $500 minimum pre-tax subtotal to check out.
        </li>
        <li>
          Catering orders that choose delivery include a flat, non-taxable $70 delivery
          fee, which is displayed at checkout.
        </li>
        <li>
          Tipping is optional and in your control. Tips are paid to the restaurant&rsquo;s
          staff. Any tip you choose is separate from the food total and is not taxed.
        </li>
        <li>
          We never ask for card details on this website. Card payments are processed
          entirely by Square, whose own terms and privacy policy apply to that part of
          your payment.
        </li>
      </ul>

      <h2>3. Allergies and dietary needs</h2>
      <div className="legal-notice">
        Food is prepared in a kitchen that handles common allergens including (but not
        limited to) nuts, dairy, eggs, gluten, soy, and seafood. Cross-contact may occur,
        and we cannot guarantee any dish is free of a given allergen. If you or someone
        you are ordering for has an allergy or dietary restriction, <strong>you must tell
        the restaurant directly</strong> by phone at +1 425-999-6271 before or when you
        place your order. Instructions entered online are helpful but are not a
        substitute for speaking to us, and we are not liable for reactions arising from
        allergens not disclosed to us directly.
      </div>

      <h2>4. Bone-in and boneless items</h2>
      <div className="legal-notice">
        Many of our chicken and mutton dishes are prepared bone-in by default, even when a
        boneless version is also on the menu. If you require a specific item to be
        strictly boneless, <strong>you must contact the restaurant directly</strong> by
        phone at +1 425-999-6271 before or when you place your order to confirm it. Even
        in dishes labeled or requested as boneless, chicken and other meat items may still
        contain small or minuscule bone fragments as a natural result of butchering and
        preparation. Please eat carefully and supervise children when serving these
        dishes; we are not liable for injury arising from bone fragments in any order.
      </div>

      <h2>5. Pickup and delivery</h2>
      <ul>
        <li>
          Pickup times for online pickup orders must fall within our operating hours for
          that day. Orders are not taken outside operating hours &mdash; if you visit the
          checkout while we are closed, you will be told when ordering reopens.
        </li>
        <li>
          Delivery for orders on this website is handled as described at checkout:
          standard menu delivery is placed through our external delivery ordering page,
          and catering delivery is arranged directly with the restaurant by our staff.
        </li>
        <li>
          We serve the greater Redmond area (within roughly 20 miles of 17020 Avondale
          Way, Redmond, WA 98052). A delivery address beyond that range may be declined,
          or may be accepted only with an additional charge discussed and agreed with the
          restaurant by phone before the order is confirmed.
        </li>
      </ul>

      <h2>6. Order timing and honesty</h2>
      <ul>
        <li>
          Please do not attempt to place orders for times outside our operating hours, or
          with pickup/delivery information that is inaccurate, misleading, or intended to
          bypass our lead times, delivery-area rules, or fees.
        </li>
        <li>
          We may verify large or unusual orders by phone, and we may cancel orders placed
          with false, fraudulent, or abusive information (including attempts to alter
          prices or totals). Your payment will be refunded for any order we cancel for
          these reasons.
        </li>
      </ul>

      <h2>7. Cancellations, changes and refunds</h2>
      <ul>
        <li>
          To change or cancel an order, call us at +1 425-999-6271 as soon as possible.
          Once food is being prepared or delivered, changes and cancellations may not be
          possible.
        </li>
        <li>
          Refunds for paid orders are issued back to the original payment method through
          Square. Refunds are at the restaurant&rsquo;s discretion where preparation has
          already begun.
        </li>
      </ul>

      <h2>8. Our responsibility</h2>
      <ul>
        <li>
          We take care to keep this website working and accurate, but we do not warrant
          that it will always be error-free or uninterrupted. To the fullest extent
          permitted by Washington law, our liability is limited to the amount you paid for
          the order in question, and we are not liable for indirect or consequential
          losses (for example, lost time, or inconvenience caused by an unavailable item
          or a late order).
        </li>
        <li>
          Nothing in these Terms limits rights you have under law that cannot be limited.
        </li>
      </ul>

      <h2>9. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. The version shown on this page at the
        time you order is the version that applies to your order.
      </p>

      <h2>10. Contact</h2>
      <p className="legal-contact">
        Bommarillu Biryani &middot; 17020 Avondale Way, Redmond, WA 98052, United States
        &middot; +1 425-999-6271
      </p>
    </section>
  );
}
