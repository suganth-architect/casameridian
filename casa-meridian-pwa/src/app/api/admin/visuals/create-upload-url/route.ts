import { NextRequest, NextResponse } from "next/server";
import { adminStorage } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
    try {
        // 1. Auth Check
        const auth = await verifyAdmin(request);
        if (auth.error) {
            console.error("Create Upload URL Auth Failed:", auth.error);
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        // 2. Input Validation
        const body = await request.json();
        const { key, filename, contentType } = body;

        if (!key || !filename || !contentType) {
            return NextResponse.json({ error: "Missing required fields: key, filename, contentType" }, { status: 400 });
        }

        // 3. Generate Path
        // siteVisuals/{key}/{timestamp}-{filename}
        const timestamp = Date.now();
        // Sanitize: allow alphanumeric, dots, dashes, underscores
        const cleanFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const storagePath = `visuals/${key}/${timestamp}-${cleanFilename}`;

        // 4. Get Default Bucket
        // Note: bucket() without arguments uses the default app's bucket option
        const bucket = adminStorage.bucket();
        const file = bucket.file(storagePath);

        // 5. Generate Signed URL
        const [uploadUrl] = await file.getSignedUrl({
            action: 'write',
            version: 'v4',
            expires: Date.now() + 10 * 60 * 1000, // 10 minutes
            contentType: contentType,
        });

        // 6. Construct Public URL
        // Used for confirmation, but confirming the path is better.
        // We handle new domain `firebasestorage.app` automatically by getting bucket name.
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
