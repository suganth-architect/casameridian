
import { parseISO, toDate } from 'date-fns';

/**
 * Safely parses various date formats into a Date object.
 * Supports:
 * - "YYYY-MM-DD" strings
 * - Firestore Timestamp { seconds, nanoseconds }
 * - Date objects
 * - ISO strings
 * 
 * Returns null if invalid or null/undefined input.
 */
export function safeParseDate(input: any): Date | null {
    if (!input) return null;

    try {
        // 1. If it's already a Date object
        if (input instanceof Date) {
            return isNaN(input.getTime()) ? null : input;
        }

        // 2. Firestore Timestamp (duck typing)
        if (typeof input === 'object' && 'seconds' in input) {
            return new Date(input.seconds * 1000);
        }

        // 3. String handling
        if (typeof input === 'string') {
            // Try standard Date constructor first (handles ISO well)
            const d = new Date(input);
            if (!isNaN(d.getTime())) return d;

            // Try date-fns parseISO for stricter ISO strings if needed, 
            // but new Date is usually sufficient for yyyy-mm-dd.
            const d2 = parseISO(input);
            if (!isNaN(d2.getTime())) return d2;
        }

        return null;
    } catch (e) {
        console.warn("Date parse error for:", input, e);
        return null;
    }
}
