import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { checkAvailability, validateDateRange } from '@/lib/availability';
import { normalizePhoneDigits, normalizePhoneE164 } from '@/lib/phone';
import { FieldValue } from 'firebase-admin/firestore';
import { differenceInDays, parseISO } from 'date-fns';

export const dynamic = 'force-dynamic';


export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { guestName, phone, email, notes, checkIn, checkOut, pricePerNight } = body;

        // 1. Basic Validation
        if (!guestName || !phone || !checkIn || !checkOut) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Validate Price
        const price = Number(pricePerNight);
        if (isNaN(price) || price <= 0) {
            return NextResponse.json({ error: 'Invalid price per night' }, { status: 400 });
        }

        // 2. Date Validation (Enforce 1 Night Minimum)
        try {
            validateDateRange(checkIn, checkOut);
        } catch (e: any) {
            // e.message from validateDateRange is "Check-out must be after check-in"
            // We append clarification for the user
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

        // 4. Calculate Nights & Price (Timezone Safe)
        const nights = differenceInDays(parseISO(checkOut), parseISO(checkIn));

        // Safety check (should be covered by validateDateRange but good to be sure)
        if (nights < 1) {
            return NextResponse.json({
                error: "Check-out must be after check-in (minimum 1 night)."
            }, { status: 400 });
        }

        const totalAmount = nights * price;

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
            pricePerNight: price,
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
