import { BookingWidget } from "@/components/booking-widget";

export default function BookPage() {
    const pricePerNight = Number(process.env.CASA_PRICE_PER_NIGHT) || 50000;

    return (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
            <div className="mb-8 text-center">
                <h1 className="text-4xl font-bold tracking-tight text-meridian-blue sm:text-5xl">
                    Book Your Sanctuary
                </h1>
                <p className="mt-4 text-lg text-gray-600">
                    Reserve your dates for an unforgettable stay.
                </p>
            </div>

            <BookingWidget pricePerNight={pricePerNight} />
        </main>
    );
}
