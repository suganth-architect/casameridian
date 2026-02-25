import Image from "next/image";
import Link from "next/link";
import { MapPin, Phone, Mail, Instagram } from "lucide-react";

export function SiteFooter() {
    return (
        <footer className="bg-slate-900 text-white border-t border-slate-800">
            <div className="container mx-auto px-6 py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

                    {/* Brand */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                            <div className="relative h-12 w-12 rounded-full overflow-hidden border border-slate-700 shrink-0">
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
                        <p className="text-slate-400 text-sm font-light leading-relaxed max-w-xs">
                            Barefoot luxury on Chennai&apos;s East Coast Road. Wake up to the sound of waves every morning.
                        </p>
                    </div>

                    {/* Contact */}
                    <div className="flex flex-col gap-3">
                        <h5 className="text-slate-200 font-semibold tracking-wide uppercase text-xs mb-1">Contact</h5>
                        <a
                            href="tel:+919500003388"
                            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
                        >
                            <Phone className="w-4 h-4 shrink-0 text-[rgb(var(--meridian-gold))]" />
                            +91 95000 03388
                        </a>
                        <a
                            href="mailto:casameridianecr@gmail.com"
                            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
                        >
                            <Mail className="w-4 h-4 shrink-0 text-[rgb(var(--meridian-gold))]" />
                            casameridianecr@gmail.com
                        </a>
                        <a
                            href="https://www.instagram.com/casa_meridian_ecr"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
                        >
                            <Instagram className="w-4 h-4 shrink-0 text-[rgb(var(--meridian-gold))]" />
                            @casa_meridian_ecr
                        </a>
                    </div>

                    {/* Address */}
                    <div className="flex flex-col gap-3">
                        <h5 className="text-slate-200 font-semibold tracking-wide uppercase text-xs mb-1">Location</h5>
                        <address className="not-italic flex items-start gap-2 text-slate-400 text-sm leading-relaxed">
                            <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-[rgb(var(--meridian-gold))]" />
                            <span>
                                210, Gandhi Road,<br />
                                VGP 2nd Part, Uthandi,<br />
                                Chennai – 600 119
                            </span>
                        </address>
                        <a
                            href="https://maps.google.com/?q=210+Gandhi+Road+VGP+2nd+Part+Uthandi+Chennai+600119"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[rgb(var(--meridian-gold))] hover:underline"
                        >
                            Get directions →
                        </a>
                    </div>
                </div>

                <div className="mt-10 pt-6 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
                    <p className="text-slate-500 text-xs">
                        &copy; {new Date().getFullYear()} Casa Meridian. All rights reserved.
                    </p>
                    <p className="text-slate-600 text-xs tracking-wide">
                        Wake Up to the Waves.
                    </p>
                </div>
            </div>
        </footer>
    );
}
