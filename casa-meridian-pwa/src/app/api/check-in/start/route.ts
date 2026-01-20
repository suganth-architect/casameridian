import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { normalizePhoneDigits } from '@/lib/phone';
import { Booking } from '@/lib/types';
import { differenceInDays, parseISO } from 'date-fns';

export async function POST(req: Request) {
    try {
        const { phone } = await req.json();

        if (!phone) {
            return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
        }

        const normalizedPhone = normalizePhoneDigits(phone);

        // Query active/confirmed bookings
        const bookingsRef = adminDb.collection('bookings');

        // Try precise match on phoneLocal first (preferred)
        let snapshot = await bookingsRef
            .where('phoneLocal', '==', normalizedPhone)
            .where('status', 'in', ['confirmed', 'checked_in'])
            .orderBy('checkIn', 'desc')
            .limit(1)
            .get();

        // Fallback: Try match on 'phone' if no result (legacy support)
        if (snapshot.empty) {
            snapshot = await bookingsRef
                .where('phone', '==', normalizedPhone)
                .where('status', 'in', ['confirmed', 'checked_in'])
                .orderBy('checkIn', 'desc')
                .limit(1)
                .get();
        }

        if (snapshot.empty) {
            return NextResponse.json({ error: 'No active booking found' }, { status: 404 });
        }

        const doc = snapshot.docs[0];
        const booking = doc.data() as Booking;

        // Calculate nights
        let nights = 0;
        if (booking.checkIn && booking.checkOut) {
            try {
                // Ensure dates are strings YYYY-MM-DD
                const start = parseISO(booking.checkIn);
                const end = parseISO(booking.checkOut);
                nights = differenceInDays(end, start);
            } catch (e) {
                console.error("Date parse error", e);
            }
        }

        // Mask Guest Name: "John Doe" -> "J***n D***e"
        const maskName = (name: string) => {
            if (!name) return "Guest";
            return name.split(' ').map(part => {
                if (part.length <= 2) return part;
                return part[0] + '*'.repeat(part.length - 2) + part[part.length - 1];
            }).join(' ');
        };

        const maskedGuestName = maskName(booking.guestName);

        // Return simplified booking data safely
        return NextResponse.json({
            id: doc.id,
            guestName: maskedGuestName,
            status: booking.status,
            kycStatus: booking.kycStatus || 'not_submitted',
            rejectionReason: booking.rejectionReason || null,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            nights: Math.max(1, nights),
        });

    } catch (error) {
        console.error("Check-in Start Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
