import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
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
            </div>
        </header>
    );
}
