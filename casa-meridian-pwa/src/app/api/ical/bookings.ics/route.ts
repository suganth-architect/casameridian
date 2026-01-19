
export async function GET() {
    const calendarData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Casa Meridian//Booking Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
END:VCALENDAR`;

    return new Response(calendarData, {
        headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': 'attachment; filename="bookings.ics"',
        },
    });
}
