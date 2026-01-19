
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export interface BlockedDateRange {
    id?: string;
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
    reason: 'maintenance' | 'privateBooking' | 'ownerBlocked';
    notes?: string;
    createdAt?: string;
    createdBy?: string;
}

export async function GET(req: NextRequest) {
    const { admin, error, status } = await verifyAdmin(req, 'admin'); // Admin+ can view
    if (error) return NextResponse.json({ error }, { status });

    try {
        const snapshot = await adminDb.collection('blockedDates').orderBy('startDate', 'asc').get();
        const blocks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json({ blocks });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const { admin, error, status } = await verifyAdmin(req, 'admin'); // Admin+ can block
    if (error) return NextResponse.json({ error }, { status });

    try {
        const body = await req.json();
        const { startDate, endDate, reason, notes } = body;

        if (!startDate || !endDate || !reason) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const newBlock = {
            startDate,
            endDate,
            reason,
            notes: notes || '',
            createdByAdminUid: admin!.uid,
            createdAt: new Date()
        };

        const ref = await adminDb.collection('blockedDates').add(newBlock);

        return NextResponse.json({ success: true, id: ref.id });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const { admin, error, status } = await verifyAdmin(req, 'admin');
    if (error) return NextResponse.json({ error }, { status });

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        await adminDb.collection('blockedDates').doc(id).delete();
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
