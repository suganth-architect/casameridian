import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import MobileNav from "@/components/mobile-nav";

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
        <main className="min-h-screen pb-24">
          {children}
        </main>
        <MobileNav />
      </body>
    </html>
  );
}
