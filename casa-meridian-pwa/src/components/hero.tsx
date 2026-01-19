'use client';

import * as React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowDown } from 'lucide-react';
// IMPORT CORRECT GETTER
import { getFirestoreDb } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

// Stable Fallback URL
const FALLBACK_URL = "https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=1920";

export function Hero() {
    const [src, setSrc] = React.useState<string>(FALLBACK_URL);

    // Listen for live updates to the Hero asset
    React.useEffect(() => {
        const db = getFirestoreDb();
        if (!db) return;

        const unsub = onSnapshot(doc(db, 'siteAssets', 'hero'), (doc) => {
            if (doc.exists() && doc.data().url) {
                setSrc(doc.data().url);
            }
        });
        return () => unsub();
    }, []);

    return (
        <div className="relative h-[90vh] w-full flex items-center justify-center overflow-hidden bg-slate-900">
            {/* Background Image with State-based Fallback */}
            <div className="absolute inset-0 z-0">
                <Image
                    src={src}
                    alt="Casa Meridian Villa"
                    fill
                    className="object-cover opacity-90 transition-opacity duration-700"
                    priority
                    onError={() => setSrc(FALLBACK_URL)} // Safe fallback
                />
                {/* Cinematic Overlay: Gradient black 40% top + 70% bottom + subtle blur */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70 backdrop-blur-[1px]" />
            </div>

            <div className="relative z-10 text-center px-4 flex flex-col items-center animate-in fade-in zoom-in duration-1000 space-y-6 max-w-4xl mx-auto">

                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-2 font-montserrat drop-shadow-xl tracking-tight leading-tight">
                    Wake Up to the Waves
                </h1>

                <p className="text-lg md:text-2xl text-slate-100 max-w-xl font-light drop-shadow-md tracking-wider mx-auto">
                    Experience barefoot luxury on Chennai’s ECR.
                </p>

                <div className="pt-8">
                    <Link href="/book">
                        <Button className="bg-[rgb(var(--meridian-gold))] hover:bg-[rgb(var(--meridian-gold))]/90 text-white rounded-full px-10 py-7 text-lg shadow-xl transition-transform hover:scale-105 font-semibold tracking-wide">
                            Book Your Stay
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="absolute bottom-8 animate-bounce text-white/70">
                <ArrowDown className="w-8 h-8" />
            </div>
        </div>
    );
}
