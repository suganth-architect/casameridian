"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, UtensilsCrossed, User } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const links = [
  { name: "Home", href: "/", icon: Home },
  { name: "Food", href: "/food", icon: UtensilsCrossed },
  { name: "My Stay", href: "/my-stay", icon: User },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="flex items-center justify-center h-16 px-4 md:justify-between max-w-7xl mx-auto">
        <Link href="/" className="relative h-12 w-48 transition-opacity hover:opacity-80">
          <Image
            src="/logo.jpg"
            alt="Casa Meridian"
            fill
            className="object-contain object-center"
            priority
          />
        </Link>

        {/* Desktop navigation — mirrors mobile bottom tabs, hidden on mobile */}
        <nav className="hidden lg:flex items-center gap-8">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-meridian-blue transition-colors",
                  isActive && "text-meridian-blue"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
