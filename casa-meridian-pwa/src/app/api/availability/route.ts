import { NextResponse } from 'next/server';
import { subDays, format, parse, isValid } from 'date-fns';

export const dynamic = 'force-dynamic';

function parseICSDate(icsDate: string): Date | null {
    if (!icsDate) return null;
    // Remove potential 'VALUE=DATE:' prefix parts or other params
    // e.g. DTSTART;VALUE=DATE:20231024
    const value = icsDate.includes(':') ? icsDate.split(':').pop() : icsDate;

    if (!value) return null;

    try {
        // Handle "20231024" format (8 chars)
        if (value.length === 8) {
            return parse(value, 'yyyyMMdd', new Date());
        }
        // Handle "20231024T120000Z" or similar
        // We can just take the first 8 chars for date-based blocking
        if (value.length >= 8) {
            return parse(value.substring(0, 8), 'yyyyMMdd', new Date());
        }
    } catch (e) {
        console.error('Error parsing date:', value, e);
    }
    return null;
}

export async function GET() {
    const icalUrl = process.env.AIRBNB_ICAL_URL;

    if (!icalUrl || icalUrl.trim() === '') {
        console.warn('AIRBNB_ICAL_URL is missing or empty.');
        return NextResponse.json({ blocked: [] });
    }

    try {
        const response = await fetch(icalUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch ICS: ${response.statusText}`);
        }
        const text = await response.text();

        // Simple manual parsing to avoid library issues
        const events = [];
        const lines = text.split(/\r\n|\n|\r/);

        let currentEvent: any = null;

        for (const line of lines) {
            if (line.trim() === 'BEGIN:VEVENT') {
                currentEvent = {};
            } else if (line.trim() === 'END:VEVENT') {
                if (currentEvent && currentEvent.start && currentEvent.end) {
                    events.push(currentEvent);
                }
                currentEvent = null;
            } else if (currentEvent) {
                if (line.startsWith('DTSTART')) {
                    currentEvent.start = parseICSDate(line);
                } else if (line.startsWith('DTEND')) {
                    currentEvent.end = parseICSDate(line);
                }
            }
        }

        const blocked = events.map((event: any) => {
            if (!isValid(event.start) || !isValid(event.end)) return null;

            // Airbnb "End Date" is exclusive. Block up to the day BEFORE check-out.
            const blockedTo = subDays(event.end, 1);

            return {
                from: format(event.start, 'yyyy-MM-dd'),
                to: format(blockedTo, 'yyyy-MM-dd'),
            };
        }).filter(Boolean);

        return NextResponse.json(
            { blocked },
            {
                headers: {
                    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
                },
            }
        );
    } catch (error) {
        console.error('Error fetching or parsing iCal:', error);
        return NextResponse.json({ blocked: [] });
    }
}
