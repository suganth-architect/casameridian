import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from "firebase-admin/firestore";
import { Booking } from '@/lib/types';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const { admin, error, status } = await verifyAdmin(req, 'admin');
    if (error) return NextResponse.json({ error }, { status });

    try {
        const bookingId = params.id;
        const bookingRef = adminDb.collection('bookings').doc(bookingId);

        // Transaction to ensure atomicity and read-your-writes state enforcement
        await adminDb.runTransaction(async (t) => {
            const doc = await t.get(bookingRef);
            if (!doc.exists) {
                throw new Error("Booking not found");
            }
            const booking = doc.data() as Booking;

            if (booking.status !== 'confirmed') {
                throw new Error(`Invalid status: ${booking.status}. Must be 'confirmed' to check-in.`);
            }

            if (booking.kycStatus !== 'verified') {
                throw new Error(`KYC not verified. Current status: ${booking.kycStatus}`);
            }

            t.update(bookingRef, {
                status: 'checked_in',
                checkedInAt: FieldValue.serverTimestamp(),
                checkInProcessedBy: admin!.uid,
                updatedAt: FieldValue.serverTimestamp()
            });
        });

        return NextResponse.json({ success: true, status: 'checked_in' });

    } catch (err: any) {
        const status = err.message.includes('Invalid status') || err.message.includes('KYC') ? 409 : 500;
        return NextResponse.json({ error: err.message }, { status });
    }
}
