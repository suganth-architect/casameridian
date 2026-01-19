
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { checkAvailability, validateDateRange } from '@/lib/availability';
import { normalizePhoneDigits, normalizePhoneE164 } from '@/lib/phone';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { guestName, phone, email, notes, checkIn, checkOut, pricePerNight } = body;

        // 1. Basic Validation
        if (!guestName || !phone || !checkIn || !checkOut || !pricePerNight) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 2. Date Validation (Enforce 1 Night Minimum)
        try {
            validateDateRange(checkIn, checkOut);
        } catch (e: any) {
            // e.message will be "Check-out must be after check-in" if 0-night
            return NextResponse.json({
                error: e.message + " (minimum 1 night)."
            }, { status: 400 });
        }

        // 3. Availability Check
        const availability = await checkAvailability({
            checkIn,
            checkOut
        });

        if (!availability.ok) {
            return NextResponse.json({
                error: 'Dates not available',
                conflict: availability.conflict
            }, { status: 409 });
        }

        // 4. Calculate Nights & Price
        // Use date-fns for consistency if needed, but strict difference of Validated YYYY-MM-DD works too
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        // diff in ms / ms per day
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const totalAmount = nights * pricePerNight;

        // 5. Create Booking Request
        const newRequest = {
            guestName,
            phone,
            phoneLocal: normalizePhoneDigits(phone),
            phoneE164: normalizePhoneE164(phone),
            email: email || '',
            notes: notes || '',
            checkIn,
            checkOut,
            nights,
            pricePerNight,
            totalAmount,
            status: 'pending',
            source: 'pwa',
            createdAt: FieldValue.serverTimestamp(),
        };

        const ref = await adminDb.collection('bookingRequests').add(newRequest);

        return NextResponse.json({ success: true, id: ref.id });

    } catch (error: any) {
        console.error('Booking request error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
