
export function normalizePhoneDigits(input: string): string {
    return (input || "").replace(/\D/g, "").slice(-10); // last 10 digits
}

// Alias for compatibility/clarity if needed
export const normalizePhone = normalizePhoneDigits;

export function normalizePhoneE164(input: string): string {
    const digits = (input || "").replace(/\D/g, "");
    if (digits.length === 10) return `+91${digits}`;
    if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
    if (digits.startsWith("+")) return input;
    if (digits.length > 10) return `+${digits}`;
    return `+91${digits.slice(-10)}`;
}
