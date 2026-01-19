import Image from "next/image";

export function SiteFooter() {
    return (
        <footer className="bg-slate-900 text-white py-12 pb-24 lg:pb-12">
            <div className="container mx-auto px-6 flex flex-col items-center gap-6">
                <div className="relative h-16 w-48 opacity-90">
                    <Image
                        src="/logo.jpg"
                        alt="Casa Meridian"
                        fill
                        className="object-contain object-center invert brightness-0" // Invert for dark background if needed, or remove if logo works on dark
                    />
                </div>
                <p className="text-slate-400 text-sm text-center">
                    © {new Date().getFullYear()} Casa Meridian. Wake Up to the Waves.
                </p>
            </div>
        </footer>
    );
}
