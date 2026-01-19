import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center px-6 py-20 text-center bg-white min-h-[calc(100vh-4rem)]">
        <h1 className="text-4xl font-bold tracking-tight text-meridian-blue sm:text-6xl">
          Wake Up to the Waves
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600 max-w-md mx-auto">
          Experience barefoot luxury where the ocean is your front yard.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link href="/book">
            <Button
              className="rounded-full bg-meridian-gold px-8 py-6 text-lg font-semibold text-white shadow-lg hover:bg-meridian-gold/90"
            >
              Book Your Stay
            </Button>
          </Link>
        </div>
      </section>

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
