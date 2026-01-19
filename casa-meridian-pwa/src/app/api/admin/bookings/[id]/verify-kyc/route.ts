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
        const { action, reason } = await req.json(); // action: 'verify' | 'reject'
        const bookingId = id;

        if (!['verify', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        if (action === 'reject' && !reason) {
            return NextResponse.json({ error: 'Reason required for rejection' }, { status: 400 });
        }

        const bookingRef = adminDb.collection('bookings').doc(bookingId);
        const bookingSnap = await bookingRef.get();
        if (!bookingSnap.exists) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

        const updates: Record<string, any> = {
            kycStatus: action === 'verify' ? 'verified' : 'rejected',
            updatedAt: FieldValue.serverTimestamp()
        };

        if (action === 'reject') {
            updates.rejectionReason = reason;
            updates.rejectedAt = FieldValue.serverTimestamp();
            updates.rejectedBy = admin!.uid;
        } else if (action === 'verify') {
            updates.verifiedAt = FieldValue.serverTimestamp();
            updates.verifiedBy = admin!.uid;
        }

        await bookingRef.update(updates);

        return NextResponse.json({ success: true, kycStatus: updates.kycStatus });

    } catch (err: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const message = (err as any).message;
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
