import type { Metadata } from "next";
import { ContactClient } from "./contact-client";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Contact Bommarillu Biryani in Redmond, WA for orders, catering inquiries, or questions. Call, message us on WhatsApp, or find our hours and directions.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return <ContactClient />;
}
