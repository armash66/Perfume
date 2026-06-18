import type { Metadata } from "next";
import { Cormorant_Garamond, Inter, Playfair_Display } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

// Global component styles from original Vite app
import "@/components/Navbar.css";
import "@/components/Pricing.css";
import "@/components/Hero.css";
import "@/components/Gifting.css";
import "@/components/Footer.css";
import "@/components/CategoriesPage.css";
import "@/components/CartPage.css";
import "@/components/Authenticity.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-cormorant",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-playfair",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Decant Atelier - Premium Fragrances",
  description: "E-commerce platform for luxury perfume decants and authenticated scents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${cormorant.variable} ${inter.variable} ${playfair.variable}`}>
        <head>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==" crossOrigin="anonymous" referrerPolicy="no-referrer" />
        </head>
        <body className="font-body antialiased bg-[#FAF6F0] text-[#1A1A1A]">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

