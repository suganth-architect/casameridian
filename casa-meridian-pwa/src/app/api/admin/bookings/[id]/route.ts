
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminDb } from '@/lib/firebase-admin';
import { normalizePhoneDigits, normalizePhoneE164 } from '@/lib/phone';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const { admin, error, status } = await verifyAdmin(req, 'admin');
    if (error) return NextResponse.json({ error }, { status });

    try {
        const body = await req.json();
        const updates: any = { updatedAt: new Date() };

        // Allow updating specific fields
        const allowedFields = ['guestName', 'phone', 'email', 'checkIn', 'checkOut', 'totalAmount', 'status', 'notes'];

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updates[field] = body[field];
            }
        }

        // Re-normalize phone if changed
        if (updates.phone) {
            updates.phoneLocal = normalizePhoneDigits(updates.phone);
            updates.phoneE164 = normalizePhoneE164(updates.phone);
        }

        // 1. Fetch current booking for validation
        const docRef = adminDb.collection('bookings').doc(id);
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }
        const currentData = docSnap.data()!;

        // 2. Status Transition Guards
        if (updates.status) {
            // Prevent modifying a finalized booking (checked_out)
            if (currentData.status === 'checked_out') {
                if (updates.status === 'confirmed' || updates.status === 'cancelled') {
                    return NextResponse.json({
                        error: `Cannot change status from 'checked_out' to '${updates.status}'`
                    }, { status: 409 });
                }
            }
        }

        await docRef.update(updates);

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const { admin, error, status } = await verifyAdmin(req, 'admin');
    if (error) return NextResponse.json({ error }, { status });

    // "Deleting" a booking usually means cancelling it.
    // However, if it was a mistake entry, Admin might want to DELETE.
    // Let's support soft cancel via PATCH 'status', and hard DELETE here.

    try {
        await adminDb.collection('bookings').doc(id).delete();
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
