import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { normalizePhoneDigits } from '@/lib/phone';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // 1. Verify Auth Header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing or invalid token' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        const { phone_number } = decodedToken;

        if (!phone_number) {
            return NextResponse.json({ error: 'Phone number not found in token' }, { status: 400 });
        }

        // 2. Normalize Phone
        const localPhone = normalizePhoneDigits(phone_number); // 10 digits
        const bookingsRef = adminDb.collection('bookings');

        // 3. Query Strategy:
        // Priority 1: Check phoneLocal (new standard)
        // Priority 2: Check phone (legacy fallback)

        let allBookings: any[] = [];

        // Query 1: New Standard
        const snapshotLocal = await bookingsRef
            .where('phoneLocal', '==', localPhone)
            .where('status', 'in', ['confirmed', 'active'])
            .get();

        if (!snapshotLocal.empty) {
            allBookings = snapshotLocal.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
            // Query 2: Fallback (exact match on 'phone' field for 'confirmed' bookings)
            // Try searching with the 10-digit version against 'phone' field just in case
            const snapshotLegacy = await bookingsRef
                .where('phone', '==', localPhone)
                .where('status', 'in', ['confirmed', 'active'])
                .get();

            if (!snapshotLegacy.empty) {
                allBookings = snapshotLegacy.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } else {
                // Query 3: Deep Fallback - Try searching with +91 version against 'phone' if distinct
                // (Only if user's raw phone differs from local, which it usually does e.g. +91...)
                // But strictly, let's just use what we have. 
                // If the user registered with "+91..." in the text field, this might match.
                // Let's assume the user input was somewhat standard.
                // For now, let's stop at localPhone match against 'phone'.
            }
        }

        // 4. Define Today (IST)
        const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD

        // 5. Determine State
        // Sort by checkIn ascending
        allBookings.sort((a, b) => (a.checkIn > b.checkIn ? 1 : -1));

        let activeStay = null;
        let upcomingStay = null;

        for (const booking of allBookings) {
            const { checkIn, checkOut } = booking;
            // Active: checkIn <= today < checkOut
            if (checkIn <= todayIST && todayIST < checkOut) {
                // If we found an active stay, this is the one.
                activeStay = booking;
                break;
            }

            // Upcoming: today < checkIn
            if (todayIST < checkIn) {
                if (!upcomingStay) upcomingStay = booking;
            }
        }

        return NextResponse.json({
            activeStay,
            upcomingStay,
            debug: process.env.NEXT_PUBLIC_DEBUG === 'true' ? {
                phoneRaw: phone_number,
                phoneLocal: localPhone,
                bookingsFound: allBookings.length,
                todayIST
            } : undefined
        });

    } catch (error: any) {
        console.error('Lookup API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
