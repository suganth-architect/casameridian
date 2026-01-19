import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Hero } from "@/components/hero";

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <Hero />

      {/* Gallery Placeholder */}
      <section className="px-6 py-12 bg-gray-50">
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="aspect-square w-full rounded-2xl bg-gray-200 animate-pulse"
            />
          ))}
        </div>
      </section>
    </div>
  );
}
