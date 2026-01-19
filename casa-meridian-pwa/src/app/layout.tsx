import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import MobileNav from "@/components/mobile-nav";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Casa Meridian",
  description: "Barefoot Luxury",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${montserrat.className} bg-gray-50 text-gray-900 antialiased`}>
        <SiteHeader />
        <main className="min-h-screen pt-16 pb-24">
          {children}
        </main>
        <SiteFooter />
        <MobileNav />
      </body>
    </html >
  );
}
