import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from "firebase-admin/firestore";
import { Booking } from '@/lib/types';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { admin, error, status } = await verifyAdmin(req, 'admin');
    if (error) return NextResponse.json({ error }, { status });

    try {
        const bookingId = id;
        const bookingRef = adminDb.collection('bookings').doc(bookingId);

        await adminDb.runTransaction(async (t) => {
            const doc = await t.get(bookingRef);
            if (!doc.exists) {
                throw new Error("Booking not found");
            }
            const booking = doc.data() as Booking;

            if (booking.status !== 'checked_in') {
                throw new Error(`Invalid status: ${booking.status}. Must be 'checked_in' to check-out.`);
            }

            t.update(bookingRef, {
                status: 'checked_out',
                checkedOutAt: FieldValue.serverTimestamp(),
                checkOutProcessedBy: admin!.uid,
                updatedAt: FieldValue.serverTimestamp()
            });
        });

        return NextResponse.json({ success: true, status: 'checked_out' });

    } catch (err: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const message = (err as any).message;
        const status = message.includes('Invalid status') ? 409 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
