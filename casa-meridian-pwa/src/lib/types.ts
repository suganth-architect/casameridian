import { Timestamp } from "firebase/firestore";

export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
export type KycStatus = 'not_submitted' | 'submitted' | 'verified' | 'rejected';
export type KycDocumentType = 'aadhaar' | 'passport' | 'license';

export interface KycDocument {
    type: KycDocumentType;
    url: string;
    uploadedAt: Timestamp;
    fileName: string;
    contentType: string;
    size: number;
}

export interface Booking {
    id: string;
    guestName: string;
    phone: string;
    phoneLocal?: string; // Normalized local format
    phoneE164?: string; // E.164 format
    email?: string;

    checkIn: string; // YYYY-MM-DD
    checkOut: string; // YYYY-MM-DD

    status: BookingStatus;
    totalAmount: number;
    notes?: string;

    // KYC & Check-in Fields
    kycStatus: KycStatus;
    kycDocuments: KycDocument[];

    checkedInAt?: Timestamp;
    checkInProcessedBy?: string;

    checkedOutAt?: Timestamp;
    checkOutProcessedBy?: string;

    rejectionReason?: string; // If KYC rejected
    rejectedAt?: Timestamp;
    rejectedBy?: string;

    verifiedAt?: Timestamp;
    verifiedBy?: string;

    approvedAt?: Timestamp; // timestamp when confirmed

    // OTA / Source Fields
    source?: 'direct' | 'walkin' | 'ota_booking_com' | 'ota_agoda' | 'ota_mmt' | 'other';
    externalBookingId?: string;
    externalReservationCode?: string;
    channelCommissionPct?: number;
    paymentMode?: 'prepaid' | 'hotel_collect' | 'partial';
    payoutAmount?: number;
    otaMeta?: Record<string, any>;

    // Cancellation Fields
    cancelledAt?: Timestamp;
    cancelledBy?: string;
    cancellationReason?: string;
    cancellationType?: 'cancelled_by_guest' | 'cancelled_by_admin' | 'cancelled_by_ota' | 'payment_failed' | 'no_show';
    cancellationNotes?: string;

    // Refund Fields
    refundStatus?: 'none' | 'pending' | 'completed';
    refundAmount?: number;
    refundReference?: string;

    // No-Show Fields
    noShow?: boolean;
    noShowAt?: Timestamp;
    noShowMarkedBy?: string;

    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}
