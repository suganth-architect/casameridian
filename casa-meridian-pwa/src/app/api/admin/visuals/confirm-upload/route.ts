
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminStorage } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
    try {
        // 1. Auth Check
        const token = request.cookies.get("firebaseAuthToken")?.value;
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const decodedToken = await adminAuth.verifyIdToken(token);

        // 2. Input Validation
        const body = await request.json();
        const { key, storagePath, publicUrl } = body; // publicUrl passed from client for convenience, or strictly reconstruct it

        if (!key || !storagePath) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 3. Make File Public
        const bucket = adminStorage.bucket();
        const file = bucket.file(storagePath);

        // Verify existence first? Explicitly make public.
        try {
            await file.makePublic();
        } catch (e) {
            console.error("Error making file public:", e);
            // Verify if it exists, if not throw
            const [exists] = await file.exists();
            if (!exists) throw new Error("File not found in storage. Upload may have failed.");
            throw e;
        }

        // Reconstruct Public URL to be safe/canonical if needed, or use the one we derived
        const finalUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

        // 4. Save to Firestore 'visuals' History
        const docRef = await adminDb.collection("visuals").add({
            category: key,
            url: finalUrl,
            storagePath,
            uploadedBy: decodedToken.uid,
            createdAt: FieldValue.serverTimestamp(),
            source: 'upload_signed_url'
        });

        // 5. Update Active 'siteAssets'
        await adminDb.collection("siteAssets").doc(key).set({
            url: finalUrl,
            updatedAt: FieldValue.serverTimestamp(),
            updatedBy: decodedToken.uid,
            source: 'upload' // Standardize source for UI
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
