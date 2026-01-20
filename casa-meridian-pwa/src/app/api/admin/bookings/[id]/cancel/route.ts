import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { Booking } from "@/lib/types";

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // 1. Admin Auth
        const token = request.cookies.get("firebaseAuthToken")?.value;
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const decodedToken = await adminAuth.verifyIdToken(token);
        // Optional: Check custom claims if needed

        const bookingId = params.id;
        const body = await request.json();
        const { reason, notes, refundAmount, refundStatus, refundReference, cancellationType } = body;

        if (!reason && !cancellationType) {
            // Basic validation, though reason isn't strictly mandatory if type is enough, 
            // but user request implies reason required in UI. We'll be lenient to API but strict in UI.
        }

        const bookingRef = adminDb.collection("bookings").doc(bookingId);

        // 2. Transaction
        const result = await adminDb.runTransaction(async (t) => {
            const doc = await t.get(bookingRef);
            if (!doc.exists) {
                throw new Error("BOOKING_NOT_FOUND");
            }

            const booking = doc.data() as Booking;

            // Idempotency: Unsafe to cancel checked_out
            if (booking.status === 'checked_out') {
                throw new Error("CANNOT_CANCEL_CHECKED_OUT");
            }
            // Idempotency: Unsafe to cancel checked_in (future: allow early checkout)
            if (booking.status === 'checked_in') {
                throw new Error("CANNOT_CANCEL_CHECKED_IN");
            }

            // Idempotency check
            if (booking.status === 'cancelled') {
                return { alreadyCancelled: true };
            }

            // Perform Update
            t.update(bookingRef, {
                status: 'cancelled',
                cancelledAt: FieldValue.serverTimestamp(),
                cancelledBy: decodedToken.uid,
                cancellationReason: reason || 'Admin API',
                cancellationType: cancellationType || 'cancelled_by_admin',
                cancellationNotes: notes || null,
                updatedAt: FieldValue.serverTimestamp(),

                // Refund data if provided
                ...(refundAmount !== undefined && { refundAmount }),
                ...(refundStatus !== undefined && { refundStatus }),
                ...(refundReference !== undefined && { refundReference }),
            });

            return { success: true };
        });

        // 3. Return response
        if (result.alreadyCancelled) {
            return NextResponse.json({
                success: true,
                status: 'cancelled',
                alreadyCancelled: true
            });
        }

        return NextResponse.json({ success: true, status: 'cancelled' });

    } catch (error: any) {
        console.error("Cancel API Error:", error);
        if (error.message === 'BOOKING_NOT_FOUND') {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }
        if (error.message === 'CANNOT_CANCEL_CHECKED_OUT') {
            return NextResponse.json({ error: "Cannot cancel a checked-out booking" }, { status: 409 });
        }
        if (error.message === 'CANNOT_CANCEL_CHECKED_IN') {
            return NextResponse.json({ error: "Cannot cancel a checked-in booking" }, { status: 409 });
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
