import type { Metadata } from 'next';
import { MENU_CATEGORIES, MENU_NOTES } from '@/data/menu';
import { Phone, MessageCircle } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Dining Menu | Casa Meridian',
    description: 'Explore our premium selection of seafood, mains, and quick bites.',
};

export default function FoodPage() {
    return (
        <div className="min-h-screen bg-slate-50 pb-32">
            {/* Hero Header */}
            <div className="bg-white pt-12 pb-8 px-6 shadow-sm border-b border-gray-100 mb-8 sticky top-0 z-40 bg-opacity-95 backdrop-blur-sm">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-3xl md:text-4xl font-serif text-gray-900 mb-2">Dining Menu</h1>
                    <p className="text-[#D4AF37] uppercase tracking-[0.2em] text-xs md:text-sm font-medium">
                        Barefoot Luxury • Fresh Catch
                    </p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 md:px-6 space-y-12 mb-16">
                {MENU_CATEGORIES.map((category) => (
                    <section key={category.title} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <h2 className="text-xl md:text-2xl font-serif text-gray-800 mb-6 flex items-center gap-3">
                            <span className="w-8 h-[1px] bg-[#D4AF37]"></span>
                            {category.title}
                            <span className="w-8 h-[1px] bg-[#D4AF37]"></span>
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            {category.sections.map((section) => (
                                <div
                                    key={section.title}
                                    className="bg-white p-5 md:p-6 rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-gray-100 hover:shadow-md transition-shadow duration-300"
                                >
                                    <h3 className="text-sm font-medium text-[#D4AF37] mb-4 uppercase tracking-wider border-b border-dashed border-gray-100 pb-2">
                                        {section.title}
                                    </h3>
                                    <ul className="space-y-3">
                                        {section.items.map((item) => (
                                            <li key={item.name} className="flex justify-between items-start group">
                                                <div className="flex-1 pr-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <span
                                                            className={`w-2 h-2 rounded-full ring-1 ring-offset-1 ${item.isVeg
                                                                    ? 'bg-green-600 ring-green-600'
                                                                    : 'bg-red-600 ring-red-600'
                                                                } shrink-0 opacity-80`}
                                                            aria-label={item.isVeg ? "Vegetarian" : "Non-vegetarian"}
                                                        />
                                                        <span className="text-gray-700 font-medium text-sm md:text-base group-hover:text-gray-900 transition-colors">
                                                            {item.name}
                                                        </span>
                                                    </div>
                                                    {item.description && (
                                                        <p className="text-[11px] md:text-xs text-gray-400 mt-1 pl-5 font-light italic">
                                                            {item.description}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="text-gray-600 font-medium text-sm md:text-base whitespace-nowrap">
                                                    ₹{item.price}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            {/* Footer Notes */}
            <div className="max-w-4xl mx-auto px-6 mb-12 text-center space-y-2">
                {MENU_NOTES.map((note, i) => (
                    <p key={i} className="text-xs md:text-sm text-gray-400 italic font-light">
                        {note}
                    </p>
                ))}
                <div className="pt-6 flex justify-center gap-4 text-xs text-gray-300">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-600 ring-1 ring-offset-1 ring-green-600"></span> Veg
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-red-600 rounded-full ring-1 ring-offset-1 ring-red-600"></span> Non-Veg
                    </div>
                </div>
            </div>

            {/* Floating CTA Buttons */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 p-4 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] z-50 safe-area-bottom">
                <div className="max-w-md mx-auto flex gap-3">
                    <a
                        href="https://wa.me/919840922883"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-green-600 text-white py-3.5 rounded-xl font-medium text-sm text-center shadow-lg shadow-green-600/20 hover:bg-green-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        <MessageCircle className="w-4 h-4" />
                        <span>WhatsApp</span>
                    </a>
                    <a
                        href="tel:+919840922883"
                        className="flex-1 bg-[#D4AF37] text-white py-3.5 rounded-xl font-medium text-sm text-center shadow-lg shadow-amber-500/20 hover:bg-[#c4a130] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        <Phone className="w-4 h-4" />
                        <span>Call Kitchen</span>
                    </a>
                </div>
            </div>
        </div>
    );
}
