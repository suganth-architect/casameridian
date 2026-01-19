
export function normalizePhoneDigits(input: string): string {
    if (!input) return "";
    // Remove all non-digit characters
    const digits = input.replace(/\D/g, '');
    // Return last 10 digits if longer than 10
    if (digits.length > 10) {
        return digits.slice(-10);
    }
    return digits;
}

export function normalizePhoneE164(input: string): string {
    const digits = normalizePhoneDigits(input);
    if (!digits) return "";
    // Assume India (+91) if 10 digits
    if (digits.length === 10) {
        return `+91${digits}`;
    }
    return `+${digits}`;
}
