
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, AdminProfile } from '@/lib/admin-auth';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

// LIST ADMINS (Owner only)
export async function GET(req: NextRequest) {
    const { admin, error, status } = await verifyAdmin(req, 'owner');
    if (error) return NextResponse.json({ error }, { status });

    try {
        const snapshot = await adminDb.collection('admins').orderBy('createdAt', 'desc').get();
        const admins = snapshot.docs.map(doc => doc.data());
        return NextResponse.json({ admins });
    } catch (err) {
        return NextResponse.json({ error: 'Failed to fetch admins' }, { status: 500 });
    }
}

// CREATE ADMIN (Owner only)
export async function POST(req: NextRequest) {
    const { admin: requester, error, status } = await verifyAdmin(req, 'owner');
    if (error) return NextResponse.json({ error }, { status });

    try {
        const body = await req.json();
        const { email, name, role } = body;

        if (!email || !name || !role) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Get UID from Auth (User must already have signed up or we fetch by email)
        // If user doesn't exist in Auth, we can't link them easily without creating a user. 
        // For simplicity, we assume they sign in with Google seamlessly if we just whitelist them. 
        // BUT, we need a UID to make the doc ID. 
        // Strategy: We will lookup user by email. If not found, we can create a placeholder or wait.
        // BETTER: Use email as search key? No, docId should be UID.
        // Let's try to fetch user by email.

        let uid;
        try {
            const userRecord = await adminAuth.getUserByEmail(email);
            uid = userRecord.uid;
        } catch (e) {
            // User doesn't exist yet. We can CREATE them or just fail.
            // Let's create a placeholder user in Auth if not exists? 
            // Or just return error "User must sign in at least once or provide UID".
            // Actually best UX: Create user by email so they can do forgot password or login via Google matched email.
            return NextResponse.json({ error: 'User does not exist in Firebase Auth. Please ask them to login/signup first.' }, { status: 404 });
        }

        const newAdmin: AdminProfile = {
            uid,
            email,
            name,
            role,
            active: true,
        };

        await adminDb.collection('admins').doc(uid).set({
            ...newAdmin,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: requester!.uid
        });

        return NextResponse.json({ admin: newAdmin });

    } catch (err: any) {
        console.error(err);
        return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 });
    }
}
