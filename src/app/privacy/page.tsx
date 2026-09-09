import "../legal.css";

export const metadata = {
  title: "Privacy Policy | Bommarillu Biryani",
  description: "How Bommarillu Biryani handles your information when you order online.",
};

export default function PrivacyPage() {
  return (
    <section className="legal-page">
      <div className="legal-page-header">
        <span className="legal-kicker">Your privacy</span>
        <h1>Privacy Policy</h1>
        <p>Bommarillu Biryani &middot; 17020 Avondale Way, Redmond, WA 98052 &middot; +1 425-420-0160</p>
      </div>
      <p className="legal-updated">Last updated: 2026</p>

      <p>
        This Privacy Policy explains what information we handle when you use this website
        and order from Bommarillu Biryani (&ldquo;we,&rdquo; &ldquo;us&rdquo;). We keep it
        simple: we only collect what we need to make and deliver your food.
      </p>

      <h2>1. Information you give us</h2>
      <p>When you place an order you provide:</p>
      <ul>
        <li>Your name and phone number (needed so we can confirm your order).</li>
        <li>Pickup or event date/time, and delivery details such as address (when relevant).</li>
        <li>
          Optional notes such as special instructions for a catering order. If you have an
          allergy, please also tell us directly by phone &mdash; online notes are not a
          substitute (see our Terms).
        </li>
      </ul>
      <p>We do not collect your email address unless you choose to share it with us by phone.</p>

      <h2>2. Payment information</h2>
      <p>
        We never see or store your card number. Payments are completed on
        <strong> Square&rsquo;s secure hosted checkout</strong> (and, for menu delivery
        orders, on Square/Cash App&rsquo;s ordering page). Square processes your payment
        and keeps its own records; Square&rsquo;s own terms and privacy policy apply to
        that processing. Order records are kept by Square on the restaurant&rsquo;s behalf
        so we can confirm and prepare your order.
      </p>

      <h2>3. Cookies and local storage</h2>
      <p>
        <strong>This website does not use advertising or tracking cookies, and we do not
        run analytics or sell your data.</strong> We do use your browser&rsquo;s local
        storage to remember what is in your order cart and whether you have dismissed a
        small pop-up on the home page. That information stays on your device and is not
        sent to us or to anyone else until you choose to place an order. You can clear it
        at any time through your browser settings.
      </p>
      <p>
        When you continue to Square&rsquo;s (or Cash App&rsquo;s) hosted pages to pay or
        order delivery, those third parties may use their own cookies and technologies.
        Please review Square&rsquo;s and Cash App&rsquo;s privacy policies for those pages.
      </p>

      <h2>4. How we use and share your information</h2>
      <ul>
        <li>To prepare, confirm, and arrange your order, and to contact you about it.</li>
        <li>
          With Square, only to the extent needed to process your payment and create your
          order.
        </li>
        <li>
          With our staff and any courier we arrange, only as needed to prepare and
          deliver your order.
        </li>
        <li>When required by law or to protect our or others&rsquo; rights.</li>
      </ul>
      <p>
        We do not sell, rent, or trade your personal information, and we do not use it for
        marketing without your consent.
      </p>

      <h2>5. How long we keep it</h2>
      <p>
        Order records are kept as long as needed to prepare your order, handle any issue
        with it, and comply with accounting and tax requirements. After that they are
        deleted or anonymized where possible.
      </p>

      <h2>6. Children</h2>
      <p>
        This website is intended for people who can lawfully place an order. We do not
        knowingly collect information from children under 13.
      </p>

      <h2>7. Your rights</h2>
      <p>
        You may ask us what information we hold about you, ask us to correct or delete it,
        or ask us to stop using it. Because we keep very little data ourselves (most
        order records live with Square), we will usually point you to Square for payment
        records. To make a request, call us at +1 425-420-0160 and we will help.
      </p>

      <h2>8. Security</h2>
      <p>
        We use industry-standard safeguards (including HTTPS) to protect this website, and
        we rely on Square&rsquo;s certified, PCI-compliant systems for payments. No
        method of transmission is 100% secure, but we work to protect your information.
      </p>

      <h2>9. Changes to this Policy</h2>
      <p>
        If we change how we handle information, we will update this page. The date at the
        top shows when it was last updated.
      </p>

      <h2>10. Contact</h2>
      <p className="legal-contact">
        Bommarillu Biryani &middot; 17020 Avondale Way, Redmond, WA 98052, United States
        &middot; +1 425-420-0160
      </p>
    </section>
  );
}
