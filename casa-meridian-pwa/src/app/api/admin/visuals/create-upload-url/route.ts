
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminStorage } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
    try {
        // 1. Auth Check
        const token = request.cookies.get("firebaseAuthToken")?.value;
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        await adminAuth.verifyIdToken(token);

        // 2. Input Validation
        const body = await request.json();
        const { key, filename, contentType } = body;

        if (!key || !filename || !contentType) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 3. Generate Path
        // siteVisuals/{key}/{timestamp}-{filename}
        const timestamp = Date.now();
        const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '');
        const storagePath = `visuals/${key}/${timestamp}-${cleanFilename}`;

        const bucket = adminStorage.bucket();
        const file = bucket.file(storagePath);

        // 4. Generate Signed URL
        const [uploadUrl] = await file.getSignedUrl({
            action: 'write',
            version: 'v4',
            expires: Date.now() + 10 * 60 * 1000, // 10 minutes
            contentType: contentType,
        });

        // 5. Construct Public URL (assuming standard firebase storage or google cloud public access)
        // Note: The file isn't public yet, confirm-upload should make it public or we make it public (if granular) or bucket is public.
        // Usually we make it public after upload. BUT Signed URL is for write. 
        // We will return the storagePath so the client can send it back to confirm-upload.
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

        return NextResponse.json({
            uploadUrl,
            storagePath,
            publicUrl,
            timestamp
        });

    } catch (error: any) {
        console.error("Create Upload URL Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
