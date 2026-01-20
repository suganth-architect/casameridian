import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // 1. Admin Auth
        const token = request.cookies.get("firebaseAuthToken")?.value;
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        await adminAuth.verifyIdToken(token);

        const bookingId = params.id;
        const body = await request.json();

        // Extract allowed fields
        const {
            source,
            externalBookingId,
            externalReservationCode,
            channelCommissionPct,
            paymentMode,
            payoutAmount,
            otaMeta
        } = body;

        // Basic validation: source is expected if we are patching source data
        if (!source && !externalBookingId && !externalReservationCode) {
            // If completely empty body, nothing to do, but technically OK.
        }

        const bookingRef = adminDb.collection("bookings").doc(bookingId);

        // 2. Update directly (no complex transaction guards needed for metadata)
        // We allow updating this even after checkout (record keeping).
        await bookingRef.update({
            ...(source && { source }),
            ...(externalBookingId !== undefined && { externalBookingId }),
            ...(externalReservationCode !== undefined && { externalReservationCode }),
            ...(channelCommissionPct !== undefined && { channelCommissionPct }),
            ...(paymentMode !== undefined && { paymentMode }),
            ...(payoutAmount !== undefined && { payoutAmount }),
            ...(otaMeta !== undefined && { otaMeta }),
            updatedAt: FieldValue.serverTimestamp()
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Source API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
