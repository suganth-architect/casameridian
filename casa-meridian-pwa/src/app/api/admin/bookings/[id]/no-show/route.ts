import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { Booking } from "@/lib/types";
import { parseISO, isBefore, startOfDay } from "date-fns";

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

        const bookingId = params.id;
        const body = await request.json();
        const { reason } = body;

        const bookingRef = adminDb.collection("bookings").doc(bookingId);

        // 2. Transaction
        const result = await adminDb.runTransaction(async (t) => {
            const doc = await t.get(bookingRef);
            if (!doc.exists) {
                throw new Error("BOOKING_NOT_FOUND");
            }

            const booking = doc.data() as Booking;

            // Idempotency check 1: Already no-show
            if (booking.noShow === true) {
                return { alreadyNoShow: true };
            }

            // Guard: Cannot mark non-confirmed as no-show (unless already cancelled/no-show, but that's handled above or below)
            // If it's already checked-in or checked-out, impossible to be no-show.
            if (booking.status === 'checked_in' || booking.status === 'checked_out') {
                throw new Error("INVALID_STATUS_FOR_NOSHOW");
            }

            // Guard: Date Check. Today >= checkIn
            // We need server time context (or consistent UTC check).
            // Simplest: Check if today (server time) is before checkIn date.
            const checkInDate = parseISO(booking.checkIn);
            const today = startOfDay(new Date()); // Local server time 00:00

            // If today is BEFORE checkIn date, we cannot mark no-show.
            // Example: CheckIn=2026-02-01. Today=2026-01-20. isBefore(today, checkInDate) = true. -> Error.
            // Example: CheckIn=2026-01-20. Today=2026-01-20. isBefore = false. -> OK.
            if (isBefore(today, checkInDate)) {
                throw new Error("TOO_EARLY_FOR_NOSHOW");
            }

            // Perform Update
            // Rule: No-Show sets status='cancelled' to free up dates.
            t.update(bookingRef, {
                status: 'cancelled',
                noShow: true,
                noShowAt: FieldValue.serverTimestamp(),
                noShowMarkedBy: decodedToken.uid,
                cancellationType: 'no_show',
                cancellationReason: reason || 'Guest did not arrive',
                cancelledAt: FieldValue.serverTimestamp(),
                cancelledBy: decodedToken.uid,
                updatedAt: FieldValue.serverTimestamp()
            });

            return { success: true };
        });

        // 3. Return response
        if (result.alreadyNoShow) {
            return NextResponse.json({
                success: true,
                status: 'cancelled',
                alreadyNoShow: true
            });
        }

        return NextResponse.json({ success: true, status: 'cancelled', noShow: true });

    } catch (error: any) {
        console.error("No-Show API Error:", error);
        if (error.message === 'BOOKING_NOT_FOUND') {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }
        if (error.message === 'INVALID_STATUS_FOR_NOSHOW') {
            return NextResponse.json({ error: "Booking is already processed (checked-in/out)" }, { status: 409 });
        }
        if (error.message === 'TOO_EARLY_FOR_NOSHOW') {
            return NextResponse.json({ error: "Cannot mark no-show before check-in date" }, { status: 409 });
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
