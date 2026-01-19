"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, UtensilsCrossed, User } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function MobileNav() {
  const pathname = usePathname();

  const links = [
    {
      name: "Home",
      href: "/",
      icon: Home,
    },
    {
      name: "Food",
      href: "/food",
      icon: UtensilsCrossed,
    },
    {
      name: "My Stay",
      href: "/my-stay",
      icon: User,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full border-t bg-white lg:hidden">
      <div className="flex h-16 items-center justify-around">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.name}
              href={link.href}
              className={cn(
                "flex flex-col items-center justify-center space-y-1 text-xs font-medium text-gray-500 hover:text-meridian-blue",
                isActive && "text-meridian-blue"
              )}
            >
              <Icon className={cn("h-6 w-6", isActive && "stroke-[2.5px]")} />
              <span>{link.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
