import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Poppins, Dancing_Script, Playfair_Display, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { OrderOnlineCartProvider, CateringCartProvider } from "@/lib/cart/cart-context";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { buildRestaurantSchema } from "@/lib/restaurant-schema";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dancingScript = Dancing_Script({
  variable: "--font-dancing-script",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const SITE_DESCRIPTION =
  "Authentic Hyderabadi-style dum biryani, halal Indian cuisine, and non-veg appetizers in Redmond, WA. Order online for pickup, or book catering for your next event.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Hyderabadi Biryani & Indian Restaurant in Redmond, WA`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "biryani Redmond",
    "Indian restaurant Redmond WA",
    "Hyderabadi biryani",
    "halal biryani Redmond",
    "non-veg appetizers",
    "Indian catering Redmond",
    "chicken biryani near me",
    "mutton biryani Redmond",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} | Hyderabadi Biryani & Indian Restaurant in Redmond, WA`,
    description: SITE_DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | Hyderabadi Biryani & Indian Restaurant in Redmond, WA`,
    description: SITE_DESCRIPTION,
  },
  verification: {
    google: "jwPDP56Os-4N8P8OyzZzV0D-erNZtXJK4699RIWilDo",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const restaurantSchema = buildRestaurantSchema();

  return (
    <html
      lang="en"
      className={`${poppins.variable} ${dancingScript.variable} ${playfairDisplay.variable} ${geistMono.variable}`}
    >
      <body>
        {/* Restaurant/LocalBusiness structured data - see src/lib/restaurant-schema.ts */}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantSchema) }}
        />
        <OrderOnlineCartProvider>
          <CateringCartProvider>
            <Navbar />
            {children}
            <Footer />
          </CateringCartProvider>
        </OrderOnlineCartProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
