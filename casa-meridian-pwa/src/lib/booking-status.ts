export const BOOKING_STATUSES = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    CHECKED_IN: 'checked_in',
    CHECKED_OUT: 'checked_out',
    CANCELLED: 'cancelled',
} as const;

export type BookingStatus = typeof BOOKING_STATUSES[keyof typeof BOOKING_STATUSES];

export const BOOKING_ACTIVE_STATUSES = ['confirmed', 'checked_in'] as const;
export const BOOKING_FINAL_STATUSES = ['checked_out', 'cancelled'] as const;

/**
 * Checks if a status is considered "active" (blocks calendar availability).
 * Includes legacy 'active' status for backward compatibility.
 */
export function isBookingActive(status: string): boolean {
    // Legacy support: 'active' is treated as confirmed/checked_in
    if (status === 'active') return true;
    return (BOOKING_ACTIVE_STATUSES as unknown as string[]).includes(status);
}
