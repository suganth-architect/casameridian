
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from "firebase-admin/firestore";

import { checkAvailability, validateDateRange, blockEndInclusiveToExclusive } from '@/lib/availability';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const { admin, error, status } = await verifyAdmin(req, 'admin');
    if (error) return NextResponse.json({ error }, { status });

    try {
        const body = await req.json();
        const { startDate, endDate, type, note } = body;

        if (!startDate || !endDate || !type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Validate Dates
        try {
            validateDateRange(startDate, endDate);
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 400 });
        }

        // 2. Check Availability
        // Blocks act as a "booking" for availability purposes.
        // We pass: checkIn=startDate, checkOut=endDate (wait! logic check)
        // Availability logic: [checkIn, checkOut).
        // 
        // IF a block is Jan 1 - Jan 5.
        // Then checkIn=Jan 1, checkOut=Jan 6? Or is block inclusive?
        // Prompt says: "calendarBlocks where date overlap occurs (inclusive or exclusive consistent)"
        // "Implement safe method: Query records where checkIn < newCheckOut"
        //
        // Let's assume standard behavior:
        // User selects Date Range in UI.
        // If they select Jan 1 to Jan 5.
        // They mean Jan 1, 2, 3, 4, 5 are BLOCKED.
        // So a booking cannot start on Jan 5.
        // So effective "CheckOut" for availability check is endDate + 1 day?
        // OR we just use string comparison if our availability logic handles blocks properly.
        //
        // Let's look at availability.ts check logic again.
        // It checks: block.startDate < checkOut && block.endDate >= checkIn.
        // If we propose a new BLOCK [S, E].
        // We need to check if any EXISTING booking [bS, bE) overlaps.
        // Overlap if: bS < E (implied +1?) AND bE > S.
        //
        // NOTE: In availability.ts, we implemented:
        // `if (bCheckIn < checkOut && bCheckOut > checkIn)` for booking-booking overlap.
        // If we treat this Block as a Booking [S, E+1 day) it fits the model.
        // BUT UI usually sends YYYY-MM-DD.
        //
        // Let's stick to simple string overlap for safety to avoid timezone math complexity if possible.
        // BUT standard booking is exclusive end date.
        // Blocks are usually inclusive. 
        // TO BE SAFE: treated as exclusive end date for calculation if possible?
        //
        // Let's look at how availability.ts handles BLOCKS checking against NEW request.
        // It assumes `startDate` and `endDate` are fields.
        // `if (block.startDate < checkOut && block.endDate >= checkIn)`
        //
        // So for NEW BLOCK creation:
        // We are checking if it conflicts with existing bookings or blocks.
        // We call `checkAvailability` with our range.
        // BUT `checkAvailability` expects `checkIn` `checkOut` (names imply exclusive end).
        //
        // If I block Jan 1 - Jan 1. (One day).
        // I want to prevent bookings on Jan 1.
        // Booking is [Jan 1, Jan 2).
        // `checkAvailability(Jan 1, Jan 2)` checks `block.startDate < Jan 2 && block.endDate >= Jan 1`.
        // Jan 1 < Jan 2 (True). Jan 1 >= Jan 1 (True). CONFLICT. Correct.
        //
        // So if I am creating a BLOCK Jan 1 - Jan 1.
        // I should call `checkAvailability(Jan 1, Jan 2)`?
        // No, the UI sends `startDate` and `endDate`.
        // If I use them directly: `checkAvailability(Jan 1, Jan 1)`?
        // `validateDateRange` throws if in >= out.
        // So I MUST parse likely inclusive input and add 1 day?
        //
        // Let's see CalendarTab.tsx payload.
        // It uses `date-fns` `format(date, 'yyyy-MM-dd')`.
        // User picks start and end. likely inclusive visual selection.
        // We really should be careful here. 
        //
        // Let's assume the safe bet:
        // If type is 'maintenance', we probably want to block the WHOLE end day too.
        // So effective "CheckOut" for availability logic is strict String comparison?
        // Let's just pass `startDate` and `endDate` but we might hit validation error if they are same.
        //
        // SOLUTION: 
        // We will pass `startDate` as checkIn.
        // We need a calculated `checkOut` that captures the full intent.
        // If start==end (1 day block), we need checkOut = start + 1 day.
        // To keep it string based and simple without timezone issues:
        // We can just rely on the fact that `checkAvailability` is robust?
        // No, `validateDateRange` enforces `checkIn < checkOut`.
        // 
        // Let's adjust availability logic? No, prompt says `checkAvailability({ checkIn, checkOut })`.
        // 
        // Let's do a simple day addition for the check.
        // Implementation:
        // 1. Calculate next day string for endDate to satisfy [start, end).
        // Wait, if I block Jan 1 - Jan 3. 
        // Booking Jan 1 - Jan 4 (exclusive) -> Jan 1, 2, 3. Overlap.
        // Booking Jan 3 - Jan 4 -> Jan 3. Overlap?
        // If Block is Jan 1-3 inclusive. Jan 3 is blocked.
        // So Booking starting Jan 3 is blocked.
        //
        // So effectively, CheckOut for `availability` check should be `endDate` (exclusive) ?
        // If Block Jan 1 - Jan 3.
        // And I pass checkIn=Jan 1, checkOut=Jan 4 (to cover Jan 3).
        // `checkAvailability` will check overlaps.

        // Calculate exclusive checkOut for availability check (endDate + 1 day)
        const effectiveCheckOut = blockEndInclusiveToExclusive(endDate);

        const availability = await checkAvailability({
            checkIn: startDate,
            checkOut: effectiveCheckOut
        });

        if (!availability.ok) {
            return NextResponse.json({
                error: 'Dates not available for blocking',
                conflict: availability.conflict
            }, { status: 409 });
        }

        const newBlock = {
            startDate,
            endDate,
            type,
            note: note || '',
            createdBy: admin!.email,
            createdAt: FieldValue.serverTimestamp(),
        };

        const ref = await adminDb.collection('calendarBlocks').add(newBlock);

        return NextResponse.json({ success: true, id: ref.id });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
