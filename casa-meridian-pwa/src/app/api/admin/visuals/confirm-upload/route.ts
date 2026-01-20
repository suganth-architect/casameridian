import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/admin-auth";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
    try {
        // 1. Auth Check
        const auth = await verifyAdmin(request);
        if (auth.error) {
            console.error("Confirm Upload Auth Failed:", auth.error);
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }
        const { admin } = auth;

        // 2. Input Validation
        const body = await request.json();
        const { key, storagePath } = body;

        if (!key || !storagePath) {
            return NextResponse.json({ error: "Missing required fields: key, storagePath" }, { status: 400 });
        }

        // 3. Make File Public
        // Ensure bucket is initialized correctly with default environment variable
        const bucket = adminStorage.bucket();
        const file = bucket.file(storagePath);

        const [exists] = await file.exists();
        if (!exists) {
            console.error(`File not found: ${storagePath}`);
            return NextResponse.json({ error: "File not found in storage. Upload may have failed." }, { status: 404 });
        }

        try {
            await file.makePublic();
        } catch (e: any) {
            console.error("Error making file public (ignoring):", e.message);
            // Don't crash if public access fails, might be bucket restricted.
            // If restricted, we might need value based signed URL for read, but goal here is public assets.
        }

        // 4. Construct Public URL
        // Handle new domain `firebasestorage.app` automatically
        const finalUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

        // 5. Save to Firestore 'visuals' History
        const docRef = await adminDb.collection("visuals").add({
            category: key,
            url: finalUrl,
            storagePath,
            uploadedBy: admin!.uid,
            createdAt: FieldValue.serverTimestamp(),
            source: 'upload_signed_url'
        });

        // 6. Update Active 'siteAssets'
        await adminDb.collection("siteAssets").doc(key).set({
            url: finalUrl,
            updatedAt: FieldValue.serverTimestamp(),
            updatedBy: admin!.uid,
            source: 'upload'
        }, { merge: true });

        return NextResponse.json({
            success: true,
            url: finalUrl,
            id: docRef.id
        });

    } catch (error: any) {
        console.error("Confirm Upload Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
