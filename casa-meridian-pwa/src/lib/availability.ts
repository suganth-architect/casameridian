import { adminDb } from '@/lib/firebase-admin';
import { addDays, format, parseISO } from 'date-fns';

export interface AvailabilityCheckResult {
    ok: boolean;
    conflict?: {
        type: 'booking' | 'block';
        id: string;
        guestName?: string;
        startDate: string;
        endDate: string;
        reason?: string;
    };
}

export interface DateRange {
    checkIn: string; // YYYY-MM-DD
    checkOut: string; // YYYY-MM-DD
}

/**
 * Validates checkIn < checkOut and proper date format.
 */
export function validateDateRange(checkIn: string, checkOut: string): void {
    const regEx = /^\d{4}-\d{2}-\d{2}$/;
    if (!checkIn.match(regEx) || !checkOut.match(regEx)) {
        throw new Error('Invalid date format. Use YYYY-MM-DD');
    }
    if (checkIn >= checkOut) {
        throw new Error('Check-out must be after check-in');
    }
}

/**
 * Validates startDate <= endDate and proper date format.
 * Allows startDate === endDate (inclusive range).
 */
export function validateBlockRange(startDate: string, endDate: string): void {
    const regEx = /^\d{4}-\d{2}-\d{2}$/;
    if (!startDate.match(regEx) || !endDate.match(regEx)) {
        throw new Error('Invalid date format. Use YYYY-MM-DD');
    }
    if (startDate > endDate) {
        throw new Error('End date must be at or after start date');
    }
}



/**
 * Helper to convert an inclusive end date (e.g. from a calendar block)
 * to an exclusive check-out date for availability checks.
 * Usage: blockEndInclusiveToExclusive("2026-02-05") -> "2026-02-06"
 */
export const blockEndInclusiveToExclusive = (endDate: string) =>
    format(addDays(parseISO(endDate), 1), "yyyy-MM-dd");

/**
 * Checks for booking or block conflicts in the given range.
 * Range is [checkIn, checkOut) for bookings.
 * Blocks are effectively treated as [startDate, endDate] inclusive for now,
 * but practically if a block is 1st-5th, you can't book 1-5.
 * 
 * Logic:
 * Two ranges [StartA, EndA) and [StartB, EndB) overlap if:
 * StartA < EndB AND EndA > StartB
 */
export async function checkAvailability({
    checkIn,
    checkOut,
    excludeBookingId
}: {
    checkIn: string;
    checkOut: string;
    excludeBookingId?: string;
}): Promise<AvailabilityCheckResult> {

    // 1. Check Bookings
    // Query Optimization: Get bookings that start before our requested end date.
    // Then filter in memory for those that end after our requested start date.
    // Bookings status IN ['confirmed', 'checked_in', 'active']
    // Note: 'active' is legacy but must be checked for conflicts
    const bookingsSnapshot = await adminDb.collection('bookings')
        .where('checkIn', '<', checkOut)
        .where('status', 'in', ['confirmed', 'checked_in', 'active'])
        .get();

    for (const doc of bookingsSnapshot.docs) {
        if (excludeBookingId && doc.id === excludeBookingId) continue;

        const booking = doc.data();
        const bCheckIn = booking.checkIn;
        const bCheckOut = booking.checkOut;

        // Overlap Check: existing.checkIn < new.checkOut AND existing.checkOut > new.checkIn
        if (bCheckIn < checkOut && bCheckOut > checkIn) {
            return {
                ok: false,
                conflict: {
                    type: 'booking',
                    id: doc.id,
                    guestName: booking.guestName,
                    startDate: bCheckIn,
                    endDate: bCheckOut
                }
            };
        }
    }

    // 2. Check Calendar Blocks
    // Blocks: startDate, endDate.
    // Typically blocks are "blocked for these dates".
    // If block is 2026-01-01 to 2026-01-02, that means Jan 1 and Jan 2 are blocked.
    // So effective range is [startDate, endDate + 1 day) IF we treat them as fully excluding,
    // OR we just treat them as standard overlap.
    // Requirement says: "calendarBlocks where date overlap occurs".
    // Let's assume block startDate/endDate follows same convention or just check raw overlap.
    // Safest: Overlap if block.startDate < new.checkOut AND block.endDate >= new.checkIn
    // (Assuming block endDate is inclusive day, so blocking 1st to 1st means 1st is blocked).

    // We'll use a safer query: startDate < checkOut
    const blocksSnapshot = await adminDb.collection('calendarBlocks')
        .where('startDate', '<', checkOut)
        .get();

    for (const doc of blocksSnapshot.docs) {
        const block = doc.data();
        // Block dates are typically inclusive in UI (start and end date are blocked).
        // So if block is Jan 1 - Jan 1, Jan 1 is blocked.
        // Booking Jan 1 - Jan 2 overlaps.
        // Logic:
        // Overlap if (BlockStart <= BookingEnd-1) AND (BlockEnd >= BookingStart)
        // Which matches: BlockStart < BookingOut AND BlockEnd >= BookingIn

        if (block.startDate < checkOut && block.endDate >= checkIn) {
            return {
                ok: false,
                conflict: {
                    type: 'block',
                    id: doc.id,
                    startDate: block.startDate,
                    endDate: block.endDate,
                    reason: block.note || block.type
                }
            };
        }
    }

    return { ok: true };
}
