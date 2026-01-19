import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminDb } from '@/lib/firebase-admin';
import { Booking } from '@/lib/types';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const { admin, error, status } = await verifyAdmin(req, 'admin');
    if (error) return NextResponse.json({ error }, { status });

    try {
        const { action, reason } = await req.json(); // action: 'verify' | 'reject'
        const bookingId = params.id;

        if (!['verify', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        if (action === 'reject' && !reason) {
            return NextResponse.json({ error: 'Reason required for rejection' }, { status: 400 });
        }

        const bookingRef = adminDb.collection('bookings').doc(bookingId);
        const bookingSnap = await bookingRef.get();
        if (!bookingSnap.exists) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

        const updates: Partial<Booking> = {
            kycStatus: action === 'verify' ? 'verified' : 'rejected'
        };

        if (action === 'reject') {
            updates.rejectionReason = reason;
        }

        await bookingRef.update(updates);

        return NextResponse.json({ success: true, kycStatus: updates.kycStatus });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
