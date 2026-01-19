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

    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}
