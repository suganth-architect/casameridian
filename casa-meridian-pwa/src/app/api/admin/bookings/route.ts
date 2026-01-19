
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminDb } from '@/lib/firebase-admin';
import { normalizePhoneDigits, normalizePhoneE164 } from '@/lib/phone';

export const dynamic = 'force-dynamic';

// LIST BOOKINGS
export async function GET(req: NextRequest) {
    const { admin, error, status } = await verifyAdmin(req, 'admin');
    if (error) return NextResponse.json({ error }, { status });

    try {
        const snapshot = await adminDb.collection('bookings')
            .orderBy('checkIn', 'desc')
            .limit(100) // Safety limit
            .get();

        const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json({ bookings });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// CREATE MANUAL BOOKING
export async function POST(req: NextRequest) {
    const { admin, error, status } = await verifyAdmin(req, 'admin');
    if (error) return NextResponse.json({ error }, { status });

    try {
        const body = await req.json();
        const { guestName, phone, email, checkIn, checkOut, totalAmount, pricePerNight, status: bookingStatus } = body;

        if (!guestName || !phone || !checkIn || !checkOut) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Validate Phone
        const phoneLocal = normalizePhoneDigits(phone);
        const phoneE164 = normalizePhoneE164(phone);

        // TODO: Availability Check (Optional for Admin but Recommended)

        const newBooking = {
            guestName,
            phone,
            phoneLocal,
            phoneE164,
            email: email || '',
            checkIn,
            checkOut,
            totalAmount: Number(totalAmount) || 0,
            pricePerNight: Number(pricePerNight) || 0,
            status: bookingStatus || 'confirmed',
            createdByAdminUid: admin!.uid,
            createdAt: new Date(),
            updatedAt: new Date(),
            source: 'admin_manual'
        };

        const ref = await adminDb.collection('bookings').add(newBooking);

        return NextResponse.json({ success: true, id: ref.id });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
