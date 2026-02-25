'use client';

import * as React from 'react';
import Image from 'next/image';
import { getFirestoreDb } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface GalleryItem {
    id: 'pool' | 'bedroom' | 'hero' | 'dining';
    label: string;
    fallback: string;
}

// Casa Meridian actual property photos (lh3 CDN serves Google Drive public files)
const GALLERY_ITEMS: GalleryItem[] = [
    {
        id: 'pool',
        label: 'Infinity Pool',
        fallback: 'https://lh3.googleusercontent.com/d/1hlBcP8pJ_RKqNmTZsvfdrM5liD1U7Zn9'
    },
    {
        id: 'bedroom',
        label: 'Master Suite',
        fallback: 'https://lh3.googleusercontent.com/d/1-rqMg9-7j6hUrheXZBvjzUOm052Kh9th'
    },
    {
        id: 'hero',
        label: 'The Villa',
        fallback: 'https://lh3.googleusercontent.com/d/1WA9lcc5QXXbWpnj45qrLE1lt7h6IQwVv'
    },
    {
        id: 'dining',
        label: 'Al Fresco Dining',
        fallback: 'https://lh3.googleusercontent.com/d/16omXTAXXlHJ2H5IofwvKen02vYF3k8PK'
    }
];

export function Gallery() {
    const [urls, setUrls] = React.useState<Record<string, string>>({});
    // Track failed image IDs to prevent infinite fallback loops
    const [failedIds, setFailedIds] = React.useState<Set<string>>(new Set());

    React.useEffect(() => {
        const db = getFirestoreDb();
        if (!db) return;

        const unsubs = GALLERY_ITEMS.map((item) => {
            return onSnapshot(doc(db, 'siteAssets', item.id), (docSnapshot) => {
                if (docSnapshot.exists() && docSnapshot.data().url) {
                    setUrls(prev => ({ ...prev, [item.id]: docSnapshot.data().url }));
                    // Reset failed state when a new URL is loaded
                    setFailedIds(prev => {
                        const next = new Set(prev);
                        next.delete(item.id);
                        return next;
                    });
                }
            });
        });

        return () => unsubs.forEach(unsub => unsub());
    }, []);

    const handleImageError = (itemId: string, fallbackUrl: string) => {
        if (!failedIds.has(itemId)) {
            setFailedIds(prev => new Set(prev).add(itemId));
            setUrls(prev => ({ ...prev, [itemId]: fallbackUrl }));
        }
    };

    return (
        <section className="py-16 md:py-24 bg-white">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 font-montserrat">
                        Spaces Designed for Serenity
                    </h2>
                    <p className="text-slate-600 max-w-2xl mx-auto font-light">
                        Every corner of Casa Meridian is crafted to provide an immersive experience of luxury and nature.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                    {GALLERY_ITEMS.map((item) => (
                        <div
                            key={item.id}
                            className="group relative h-64 md:h-80 lg:h-96 w-full overflow-hidden rounded-3xl shadow-lg cursor-pointer"
                        >
                            <Image
                                src={urls[item.id] || item.fallback}
                                alt={item.label}
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-110"
                                onError={() => handleImageError(item.id, item.fallback)}
                            />
                            {/* Gradient Overlay */}
                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent opacity-80 transition-opacity group-hover:opacity-100" />

                            {/* Label */}
                            <div className="absolute bottom-6 left-6 text-white">
                                <h3 className="text-xl font-semibold tracking-wide drop-shadow-md">
                                    {item.label}
                                </h3>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
