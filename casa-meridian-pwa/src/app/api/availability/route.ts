import { NextResponse } from 'next/server';
import { subDays, format, isValid, parseISO, parse } from 'date-fns';
import { getAdminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

// Helper: Custom lightweight ICS parser
function parseICS(icsData: string) {
    const blockedRanges: { from: string; to: string }[] = [];
    const lines = icsData.split(/\r\n|\n|\r/);
    let inEvent = false;
    let dtStart: Date | null = null;
    let dtEnd: Date | null = null;

    for (const line of lines) {
        if (line.startsWith('BEGIN:VEVENT')) {
            inEvent = true;
            dtStart = null;
            dtEnd = null;
        } else if (line.startsWith('END:VEVENT')) {
            if (inEvent && dtStart && dtEnd && isValid(dtStart) && isValid(dtEnd)) {
                // Airbnb Rule: End date is exclusive (checkout). Block until End - 1 day.
                const adjustedEnd = subDays(dtEnd, 1);
                if (adjustedEnd >= dtStart) {
                    blockedRanges.push({
                        from: format(dtStart, 'yyyy-MM-dd'),
                        to: format(adjustedEnd, 'yyyy-MM-dd'),
                    });
                }
            }
            inEvent = false;
        } else if (inEvent) {
            // Robust Extraction: Handle extra params like DTSTART;TZID=Asia/Kolkata:2023...
            if (line.startsWith('DTSTART')) {
                const val = line.substring(line.indexOf(':') + 1);
                dtStart = parseDateString(val);
            } else if (line.startsWith('DTEND')) {
                const val = line.substring(line.indexOf(':') + 1);
                dtEnd = parseDateString(val);
            }
        }
    }
    return blockedRanges;
}

// Helper: Parse ICS date strings (YYYYMMDD or YYYYMMDDT...)
function parseDateString(str: string): Date | null {
    const raw = str.trim();
    // Remove Time component (T...) and Z suffix to get pure Date YYYYMMDD
    const dateOnly = raw.split('T')[0].replace('Z', '');

    if (dateOnly.length === 8) {
        return parse(dateOnly, 'yyyyMMdd', new Date());
    }
    return null;
}

export async function GET() {
    const iCalUrl = process.env.AIRBNB_ICAL_URL;
    let allBlockedDates: { from: string; to: string }[] = [];

    // 1. Fetch & Parse Airbnb ICS (Manual Parser)
    if (!iCalUrl || iCalUrl.trim() === '') {
        console.warn('⚠️ AIRBNB_ICAL_URL missing in environment variables');
    } else {
        try {
            const response = await fetch(iCalUrl);
            if (response.ok) {
                const text = await response.text();
                const airbnbBlocked = parseICS(text);
                allBlockedDates = [...allBlockedDates, ...airbnbBlocked];
            }
        } catch (error) {
            console.error('❌ Error fetching Airbnb iCal:', error);
        }
    }

    // 2. Fetch Firestore Confirmed Bookings (Admin SDK)
    try {
        const bookingsSnapshot = await getAdminDb()
            .collection('bookings')
            .where('status', '==', 'confirmed')
            .get();

        const firestoreBlocked = bookingsSnapshot.docs.map(doc => {
            const data = doc.data();
            // Logic: Block from CheckIn up to (CheckOut - 1 day)
            const checkOutDate = parseISO(data.checkOut);
            const blockedEnd = subDays(checkOutDate, 1);

            return {
                from: data.checkIn,
                to: format(blockedEnd, 'yyyy-MM-dd'),
            };
        });

        allBlockedDates = [...allBlockedDates, ...firestoreBlocked];

    } catch (error) {
        console.error('❌ Error fetching Firestore bookings:', error);
    }

    return NextResponse.json(
        { blocked: allBlockedDates },
        {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
            },
        }
    );
}
