import type { Metadata } from "next";
import "./globals.css";
// Use locally-bundled Montserrat variable font (avoids build-time Google Fonts fetch)
import "@fontsource-variable/montserrat";
import MobileNav from "@/components/mobile-nav";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: {
    default: "Casa Meridian – Barefoot Luxury Beach Villa | Chennai ECR",
    template: "%s | Casa Meridian"
  },
  description:
    "Casa Meridian is a private luxury beach villa on Chennai's East Coast Road (ECR), Uthandi. Enjoy a private infinity pool, beach access, and chef on request. Book your stay today.",
  keywords: [
    "Casa Meridian", "beach villa Chennai", "ECR villa", "luxury villa ECR",
    "private beach Chennai", "Uthandi villa", "Chennai beach resort", "barefoot luxury",
    "private infinity pool Chennai", "luxury villa rental Chennai"
  ],
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://casameridian.com",
    siteName: "Casa Meridian",
    title: "Casa Meridian – Barefoot Luxury Beach Villa | Chennai ECR",
    description:
      "Private luxury beach villa on Chennai's ECR with infinity pool, beach access, and chef on request.",
    images: [
      {
        url: "https://casameridian.com/logo.jpg",
        width: 1200,
        height: 630,
        alt: "Casa Meridian – Private Beach Villa"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Casa Meridian – Barefoot Luxury Beach Villa",
    description: "Private luxury beach villa on Chennai's ECR with infinity pool and beach access.",
  },
  icons: {
    icon: [
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" }
    ],
    apple: "/favicon/apple-touch-icon.png",
    shortcut: "/favicon/favicon.ico"
  },
  manifest: "/favicon/site.webmanifest",
  metadataBase: new URL("https://casameridian.com"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <SiteHeader />
        <main className="min-h-screen pt-16 pb-24 lg:pb-0">
          {children}
        </main>
        <SiteFooter />
        <MobileNav />
      </body>
    </html>
  );
}
