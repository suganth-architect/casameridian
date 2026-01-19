import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
    return (
        <footer className="bg-slate-900 text-white py-12 border-t border-slate-800">
            <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">

                {/* Brand / Logo */}
                <div className="flex items-center gap-4">
                    <div className="relative h-12 w-12 rounded-full overflow-hidden border border-slate-700">
                        <Image
                            src="/logo.jpg"
                            alt="Casa Meridian"
                            fill
                            className="object-cover"
                        />
                    </div>
                    <div>
                        <h4 className="font-montserrat font-bold text-lg tracking-wider text-slate-100">CASA MERIDIAN</h4>
                        <p className="text-xs text-slate-400 tracking-widest uppercase">Private Beach Villa</p>
                    </div>
                </div>

                {/* Copyright */}
                <div className="flex flex-col items-center md:items-end gap-1">
                    <p className="text-slate-400 text-sm font-light">
                        &copy; {new Date().getFullYear()} Casa Meridian.
                    </p>
                    <p className="text-slate-500 text-xs tracking-wide">
                        Wake Up to the Waves.
                    </p>
                </div>
            </div>
        </footer>
    );
}
