
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { normalizePhoneDigits } from '@/lib/phone';

// Force dynamic/no-cache for this lookup
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // 1. Verify Token
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing token' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];
        const decoded = await adminAuth.verifyIdToken(token);

        // 2. Identify User Phone
        const userPhone = decoded.phone_number || '';
        const localPhone = normalizePhoneDigits(userPhone);

        if (!localPhone) {
            return NextResponse.json({ error: 'No phone number linked to user' }, { status: 400 });
        }

        // 3. Current Time (IST)
        const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

        // 4. Query Bookings
        // Priority 1: phoneLocal == localPhone
        // Priority 2: phone == localPhone (legacy)

        const bookingsRef = adminDb.collection('bookings');

        // We cannot do OR queries easily across fields without complex indexes sometimes.
        // Let's run two queries and merge (safe for small scale).

        const q1 = await bookingsRef.where('phoneLocal', '==', localPhone).get();
        const q2 = await bookingsRef.where('phone', '==', localPhone).get();
        // Also check if phone is stored with +91 in legacy
        // const q3 = ...

        const allDocs = new Map();
        [...q1.docs, ...q2.docs].forEach(d => {
            allDocs.set(d.id, { id: d.id, ...d.data() });
        });

        let bookings = Array.from(allDocs.values());

        // Filter valid statuses
        bookings = bookings.filter(b => ['confirmed', 'active', 'completed'].includes(b.status));

        // Sort by checkIn ascending
        bookings.sort((a, b) => a.checkIn.localeCompare(b.checkIn));

        // 5. Determine State
        // active: checkIn <= todayIST < checkOut
        // upcoming: todayIST < checkIn
        // last: checkOut <= todayIST (most recent past) -- effectively the last one in the list that is past

        let activeStay = null;
        let upcomingStay = null;
        let lastStay = null;

        // Iterate to find active or upcoming
        for (const b of bookings) {
            if (b.checkIn <= todayIST && todayIST < b.checkOut) {
                activeStay = b;
                break; // Found active
            } else if (todayIST < b.checkIn) {
                if (!upcomingStay) upcomingStay = b; // First upcoming
            }
        }

        // Find last stay (most recent past)
        // We want the one with max checkOut that is <= todayIST
        const pastBookings = bookings.filter(b => b.checkOut <= todayIST);
        if (pastBookings.length > 0) {
            // Sort by checkOut desc
            pastBookings.sort((a, b) => b.checkOut.localeCompare(a.checkOut));
            lastStay = pastBookings[0];
        }

        // Debug Payload (only if requested or in dev)
        const debug = {
            phoneRaw: userPhone,
            phoneLocal: localPhone,
            todayIST,
            bookingsFound: bookings.length,
            bookingIds: bookings.map((b: any) => b.id)
        };

        return NextResponse.json({
            activeStay,
            upcomingStay,
            lastStay,
            debug: process.env.NEXT_PUBLIC_DEBUG === "true" ? debug : undefined
        });

    } catch (error) {
        console.error('Stay Lookup Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
