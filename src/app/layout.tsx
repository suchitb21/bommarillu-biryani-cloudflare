import type { Metadata } from "next";
import { Poppins, Dancing_Script, Playfair_Display, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { OrderOnlineCartProvider, CateringCartProvider } from "@/lib/cart/cart-context";

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

export const metadata: Metadata = {
  title: "Bommarillu Biryani",
  description:
    "Layer by layer, sealed and slow-cooked the old way — handi-fresh basmati and a masala recipe passed down through generations.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${dancingScript.variable} ${playfairDisplay.variable} ${geistMono.variable}`}
    >
      <body>
        <OrderOnlineCartProvider>
          <CateringCartProvider>
            <Navbar />
            {children}
            <Footer />
          </CateringCartProvider>
        </OrderOnlineCartProvider>
      </body>
    </html>
  );
}
