
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminDb } from '@/lib/firebase-admin';
import { getStorage } from 'firebase-admin/storage';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
    const { bookingId } = await params;
    const { admin, error, status } = await verifyAdmin(req, 'staff'); // Staff+ can view docs
    if (error) return NextResponse.json({ error }, { status });

    try {
        const docSnap = await adminDb.collection('checkinDocuments').doc(bookingId).get();
        if (!docSnap.exists) {
            return NextResponse.json({ documents: null });
        }
        return NextResponse.json({ documents: docSnap.data() });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
    const { bookingId } = await params;
    const { admin, error, status } = await verifyAdmin(req, 'staff');
    if (error) return NextResponse.json({ error }, { status });

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const type = formData.get('type') as string; // 'guestIdProof' | 'signedAgreement'

        if (!file || !type) {
            return NextResponse.json({ error: 'Missing file or type' }, { status: 400 });
        }

        // Validate Type
        if (!['guestIdProof', 'signedAgreement'].includes(type)) {
            return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = `${type}_${Date.now()}.${file.name.split('.').pop()}`;
        const path = `checkin/${bookingId}/${filename}`;

        const bucket = getStorage().bucket(process.env.FIREBASE_STORAGE_BUCKET);
        const fileRef = bucket.file(path);

        await fileRef.save(buffer, {
            metadata: {
                contentType: file.type,
            },
        });

        // Make public or signed? 
        // Admin SDK default buckets are private. We usually want a signed URL or make it public.
        // For simplicity and admin use, let's get a Signed URL valid for 7 days or make public?
        // Requirement: "View current docs links".
        // Let's generate a long-lived signed URL (e.g. 100 years or just make public).
        // Making public is easiest for "View" if security allows. But these are ID proofs...
        // SECURE: Use Signed URLs.

        const [url] = await fileRef.getSignedUrl({
            action: 'read',
            expires: '03-01-2030', // Long expiry for now
        });

        // Update Firestore
        const updateData: any = {
            updatedAt: new Date(),
            [`${type}Url`]: url,
            [`${type}Path`]: path, // Store path to delete later if needed
            lastUpdatedBy: admin!.uid
        };

        await adminDb.collection('checkinDocuments').doc(bookingId).set(updateData, { merge: true });

        return NextResponse.json({ success: true, url });

    } catch (err: any) {
        console.error(err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
