
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
    const { uid } = await params;

    // Verify Owner
    const { admin: requester, error, status } = await verifyAdmin(req, 'owner');
    if (error) return NextResponse.json({ error }, { status });

    try {
        const body = await req.json();
        const { role, active } = body;

        // Prevent self-lockout (optional but good)
        if (requester!.uid === uid && (active === false || role !== 'owner')) {
            return NextResponse.json({ error: 'Cannot deactivate or demote yourself' }, { status: 400 });
        }

        const updates: any = { updatedAt: new Date() };
        if (role) updates.role = role;
        if (typeof active === 'boolean') updates.active = active;

        await adminDb.collection('admins').doc(uid).update(updates);

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
    const { uid } = await params;

    const { admin: requester, error, status } = await verifyAdmin(req, 'owner');
    if (error) return NextResponse.json({ error }, { status });

    try {
        if (requester!.uid === uid) {
            return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
        }

        await adminDb.collection('admins').doc(uid).delete();
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
