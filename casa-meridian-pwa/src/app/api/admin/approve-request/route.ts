
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from "firebase-admin/firestore";
import { normalizePhoneDigits, normalizePhoneE164 } from '@/lib/phone';
import { checkAvailability, validateDateRange } from '@/lib/availability';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const { admin, error, status } = await verifyAdmin(req, 'admin');
    if (error) return NextResponse.json({ error }, { status });

    try {
        const { requestId } = await req.json();
        if (!requestId) return NextResponse.json({ error: 'Missing requestId' }, { status: 400 });

        // 1. Fetch Request
        const requestRef = adminDb.collection('bookingRequests').doc(requestId);
        const requestSnap = await requestRef.get();

        if (!requestSnap.exists) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        const requestData = requestSnap.data()!;

        // 1.1 Status Guard
        if (requestData.status !== 'pending') {
            return NextResponse.json({ error: `Request already processed (Status: ${requestData.status})` }, { status: 409 });
        }

        // 2. Validate Data
        try {
            validateDateRange(requestData.checkIn, requestData.checkOut);
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 400 });
        }

        // 3. Check Availability
        const availability = await checkAvailability({
            checkIn: requestData.checkIn,
            checkOut: requestData.checkOut
        });

        if (!availability.ok) {
            return NextResponse.json({
                error: 'Dates no longer available',
                conflict: availability.conflict
            }, { status: 409 });
        }

        // 4. Create Booking & Update Request (Batch/Transaction for safety)
        const batch = adminDb.batch();

        const newBookingRef = adminDb.collection('bookings').doc();
        const phoneLocal = normalizePhoneDigits(requestData.phone);
        const phoneE164 = normalizePhoneE164(requestData.phone);

        batch.set(newBookingRef, {
            guestName: requestData.guestName,
            phone: phoneLocal,
            phoneLocal: phoneLocal,
            phoneE164: phoneE164,
            email: requestData.email || '',
            checkIn: requestData.checkIn,
            checkOut: requestData.checkOut,
            nights: Number(requestData.nights) || 0,
            totalAmount: Number(requestData.totalAmount) || 0,
            pricePerNight: Number(requestData.pricePerNight) || 0,
            requestId: requestId,
            status: 'confirmed',
            source: 'approved_request',
            createdByAdminUid: admin!.uid,
            createdAt: FieldValue.serverTimestamp(), // Firestore server timestamp
            approvedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        // Update Request Status
        batch.update(requestRef, {
            status: 'approved',
            bookingId: newBookingRef.id,
            updatedAt: FieldValue.serverTimestamp(),
            approvedBy: admin!.uid
        });

        await batch.commit();

        return NextResponse.json({ success: true, bookingId: newBookingRef.id });

    } catch (err: any) {
        console.error("Error approving request:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
