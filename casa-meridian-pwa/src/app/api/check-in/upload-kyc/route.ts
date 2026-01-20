import { NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { FieldValue } from "firebase-admin/firestore";
import { Booking } from '@/lib/types';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const ALLOWED_DOC_TYPES = ['aadhaar', 'passport', 'license'];

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const bookingId = formData.get('bookingId') as string;
        const docType = formData.get('docType') as string;

        if (!file || !bookingId || !docType) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Validate Meta
        if (!ALLOWED_DOC_TYPES.includes(docType)) {
            return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
        }

        // 2. Validate File
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'File too large (Max 5MB)' }, { status: 413 });
        }
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ error: 'Invalid file type (JPG/PNG/PDF only)' }, { status: 400 });
        }

        // 3. Validate Booking
        const bookingRef = adminDb.collection('bookings').doc(bookingId);
        const bookingSnap = await bookingRef.get();

        if (!bookingSnap.exists) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        const booking = bookingSnap.data() as Booking;

        // Allow uploads if confirmed OR already checked_in (case: forgot to upload back side?)
        // Strictly speaking, prompt said: "allow only if status = confirmed" for /start, 
        // but for upload, let's keep it robust. If status is checked_out or cancelled, block.
        if (['checked_out', 'cancelled'].includes(booking.status)) {
            return NextResponse.json({ error: 'Booking is no longer active' }, { status: 409 });
        }

        // 4. Upload to Firebase Storage
        const buffer = Buffer.from(await file.arrayBuffer());
        const ext = file.name.split('.').pop() || 'jpg';
        const timestamp = Date.now();
        const filename = `${docType}-${timestamp}.${ext}`;
        const filePath = `checkins/${bookingId}/${filename}`;

        const bucket = adminStorage.bucket();
        const fileRef = bucket.file(filePath);

        await fileRef.save(buffer, {
            metadata: {
                contentType: file.type,
            }
        });

        // Get signed URL or Public URL? 
        // Admin SDK `save` doesn't automatically return a public URL. 
        // We can make it public or sign it.
        // For simplicity and security, we generate a Signed URL valid for a long time (e.g. 7 days or 100 years if we want perm link).
        // OR better: store the Storage Path and let Client use Client SDK to view if they have perm, 
        // BUT Admin needs to view it.
        // Let's generate a signed URL valid for 7 days for the Admin to view.
        // Actually, best practice for Admin Dashboard is to generate signed URL on fly when viewing.
        // But for `kycDocuments` array, we need a URL field.
        // Let's make the file public for simplicity? No, that's insecure for ID cards.
        // Let's store the `storagePath` and a long-lived signed URL (e.g. 1 year).
        // Or just the `storagePath` and `url` is a signed URL.

        const [signedUrl] = await fileRef.getSignedUrl({
            action: 'read',
            expires: '01-01-2030' // Long lived for MVP. Ideally dynamic.
        });

        // 5. Update Booking
        const kycDoc = {
            type: docType,
            url: signedUrl,
            storagePath: filePath,
            fileName: file.name,
            contentType: file.type,
            size: file.size,
            uploadedAt: FieldValue.serverTimestamp() // Use FieldValue for admin sdk
        };

        await bookingRef.update({
            kycStatus: 'submitted',
            rejectionReason: null, // Reset rejection reason on new upload
            kycDocuments: FieldValue.arrayUnion(kycDoc)
        });

        return NextResponse.json({ success: true, url: signedUrl, status: 'submitted' });

    } catch (error: any) {
        console.error("Upload KYC Error:", error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
