import { NextResponse } from 'next/server';
import { generateLuxuryImage } from '@/lib/genai';
import { adminDb } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { FieldValue } from 'firebase-admin/firestore';

export const maxDuration = 60; // Allow 60s for AI generation

const ADMIN_EMAILS = ['luckysuganth@gmail.com', 'mbsujith23@gmail.com'];

export async function POST(req: Request) {
    try {
        // 1. Secure Server-Side Auth Verification
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await getAuth().verifyIdToken(idToken);

        if (!ADMIN_EMAILS.includes(decodedToken.email || '')) {
            return NextResponse.json({ error: 'Forbidden: Admin access only' }, { status: 403 });
        }

        // 2. Parse Request
        const { type } = await req.json();
        let prompt = "";

        // Pre-defined prompts for consistency
        if (type === 'hero') prompt = "Wide angle view of white modern luxury beach villa, ocean facing, infinity pool foreground.";
        else if (type === 'pool') prompt = "Top down aesthetic view of turquoise swimming pool, wooden deck, tropical shadows.";
        else if (type === 'bedroom') prompt = "Luxury master bedroom interior, king bed, white linen, ocean view from window.";
        else if (type === 'dining') prompt = "Luxury dining area in a modern beach villa, warm ambient lighting, minimal furniture, premium lifestyle photography.";
        else return NextResponse.json({ error: "Invalid asset type" }, { status: 400 });

        // 3. Generate Image
        const imageBuffer = await generateLuxuryImage(prompt);

        // 4. Upload to Firebase Storage (Default Bucket)
        const bucket = getStorage().bucket(process.env.FIREBASE_STORAGE_BUCKET);
        const fileName = `site-assets/${type}-${Date.now()}.png`; // Unique filename
        const file = bucket.file(fileName);

        await file.save(imageBuffer, {
            metadata: { contentType: 'image/png' },
        });

        // Make public explicitly
        await file.makePublic();

        // Construct Public URL
        // Note: Default bucket usually requires this format or signed URLs. 
        // publicUrl() method is convenient but depends on bucket config.
        // This manual construction is often safer for standard Firebase Storage buckets.
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

        // 5. Persist URL in Firestore
        await adminDb.collection('siteAssets').doc(type).set({
            url: publicUrl,
            updatedAt: FieldValue.serverTimestamp(),
            updatedBy: decodedToken.email
        });

        return NextResponse.json({ success: true, url: publicUrl });

    } catch (error: any) {
        console.error("Asset Gen Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
