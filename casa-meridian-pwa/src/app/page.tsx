import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Hero } from "@/components/hero";
import { Gallery } from "@/components/gallery";
import { Waves, Umbrella, Utensils } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <Hero />

      {/* Features Strip */}
      <section className="bg-slate-50 py-12 border-b border-slate-100">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-center gap-8 md:gap-16 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-white rounded-full shadow-sm text-slate-700">
              <Waves className="w-6 h-6" />
            </div>
            <span className="font-medium text-slate-800 tracking-wide uppercase text-sm">Private Beach Access</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-white rounded-full shadow-sm text-slate-700">
              <Umbrella className="w-6 h-6" />
            </div>
            <span className="font-medium text-slate-800 tracking-wide uppercase text-sm">Private Infinity Pool</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-white rounded-full shadow-sm text-slate-700">
              <Utensils className="w-6 h-6" />
            </div>
            <span className="font-medium text-slate-800 tracking-wide uppercase text-sm">Chef on Request</span>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <Gallery />
    </div>
  );
}
