import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { normalizePhoneDigits } from '@/lib/phone';
import { Booking } from '@/lib/types';
import { BOOKING_ACTIVE_STATUSES } from '@/lib/booking-status';

export async function POST(req: Request) {
    try {
        const { phone } = await req.json();

        if (!phone) {
            return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
        }

        const normalizedPhone = normalizePhoneDigits(phone);

        // Query active/confirmed bookings
        // We look for bookings where guest is confirmed or already checked_in
        // We use phoneLocal as the primary lookup key if available, but for now we might need to support both or ensure we query correctly.
        // The plan says: query bookings where phoneLocal == normalizedPhone AND status in ['confirmed','checked_in']

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

        // Return simplified booking data safely
        return NextResponse.json({
            id: doc.id,
            guestName: booking.guestName,
            status: booking.status,
            kycStatus: booking.kycStatus || 'not_submitted',
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            // If we want to show existing documents status? 
            // Maybe just kycStatus is enough for the UI to decide flow.
        });

    } catch (error) {
        console.error("Check-in Start Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
