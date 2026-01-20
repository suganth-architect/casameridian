
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

        // 2. Parse Form Data
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const category = formData.get('category') as string;

        if (!file || !category) {
            return NextResponse.json({ error: "Missing file or category" }, { status: 400 });
        }

        // 3. Validation
        const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            return NextResponse.json({ error: "Invalid file type. Only PNG/JPG/WEBP allowed." }, { status: 400 });
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB
            return NextResponse.json({ error: "File too large (Max 10MB)" }, { status: 400 });
        }

        // 4. Upload to Firebase Storage
        const buffer = Buffer.from(await file.arrayBuffer());
        const timestamp = Date.now();
        const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`; // Sanitize
        const bucketPath = `visuals/${category}/${filename}`;

        const bucket = adminStorage.bucket();
        const storageFile = bucket.file(bucketPath);

        await storageFile.save(buffer, {
            contentType: file.type,
            metadata: {
                metadata: {
                    uploadedBy: decodedToken.uid
                }
            }
        });

        // Make public
        await storageFile.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${bucketPath}`;

        // 5. Save to Firestore 'visuals' collection (History)
        const docRef = await adminDb.collection("visuals").add({
            category,
            url: publicUrl,
            storagePath: bucketPath,
            size: file.size,
            type: file.type,
            uploadedBy: decodedToken.uid,
            createdAt: FieldValue.serverTimestamp()
        });

        // 6. Update 'siteAssets' collection (Active) - for UI to reflect immediately
        await adminDb.collection("siteAssets").doc(category).set({
            url: publicUrl,
            updatedAt: FieldValue.serverTimestamp(),
            updatedBy: decodedToken.uid,
            source: 'upload'
        }, { merge: true });

        return NextResponse.json({
            success: true,
            url: publicUrl,
            id: docRef.id
        });

    } catch (error: any) {
        console.error("Upload API Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
