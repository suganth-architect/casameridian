'use client';

import * as React from 'react';
import { CalendarIcon, Loader2, CheckCircle2 } from 'lucide-react';
import { differenceInDays, format, parseISO, isWithinInterval, addDays } from 'date-fns';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BookingWidgetProps {
    pricePerNight: number;
}

export function BookingWidget({ pricePerNight }: BookingWidgetProps) {
    const [date, setDate] = React.useState<DateRange | undefined>();
    const [blockedRanges, setBlockedRanges] = React.useState<{ from: Date; to: Date }[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [submitting, setSubmitting] = React.useState(false);

    // UX States
    const [success, setSuccess] = React.useState(false);
    const [lastRequest, setLastRequest] = React.useState<{ name: string, nights: number } | null>(null);
    const [overlapError, setOverlapError] = React.useState(false);
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

    // Form State
    const [guestName, setGuestName] = React.useState('');
    const [phone, setPhone] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [notes, setNotes] = React.useState('');

    React.useEffect(() => {
        async function fetchAvailability() {
            try {
                const res = await fetch('/api/availability');
                const data = await res.json();
                if (data.blocked) {
                    const ranges = data.blocked.map((range: { from: string; to: string }) => ({
                        from: parseISO(range.from),
                        to: parseISO(range.to),
                    }));
                    setBlockedRanges(ranges);
                }
            } catch (err) {
                console.error('Failed to load availability', err);
            } finally {
                setLoading(false);
            }
        }
        fetchAvailability();
    }, []);

    // Enforce 1-Night Minimum Rule
    React.useEffect(() => {
        if (date?.from) {
            // Case 1: No Check-out selected yet -> Auto select next day
            if (!date.to) {
                // We do this via a small timeout to let the user pick if they are fast, 
                // BUT the requirement says "Auto-set... if check-out is empty".
                // Actually, typically date range pickers wait for second click.
                // If we force set it immediately, it might be annoying if they want to pick a later date.
                // Re-reading definition: "When user selects check-in date: Auto-set check-out to the next day... if check-out is empty" - this implies immediate feedback.
                // Let's set it.
                setDate(prev => ({ from: prev!.from!, to: addDays(prev!.from!, 1) }));
            }
            // Case 2: Check-out exists but is <= Check-in (Same day or before)
            else if (date.to && differenceInDays(date.to, date.from) < 1) {
                setDate(prev => ({ from: prev!.from!, to: addDays(prev!.from!, 1) }));
            }
        }
    }, [date?.from]); // specific dependency to avoid loops? No, if we change `date` it triggers. Need to be careful.
    // If I setDate inside, it triggers again. 
    // If logic is stable (to = from + 1), it shouldn't loop infinitely if already correct.
    // BUT `react-day-picker` might fire weirdly.
    // Let's try to be safer:

    const handleDateSelect = (range: DateRange | undefined) => {
        if (!range) {
            setDate(undefined);
            return;
        }

        let newRange = { ...range };

        // 1. If we have a start date
        if (newRange.from) {
            // If End is missing OR End is same/before Start -> Set End to Start + 1
            if (!newRange.to || differenceInDays(newRange.to, newRange.from) < 1) {
                newRange.to = addDays(newRange.from, 1);
            }
        }

        setDate(newRange);
    };

    React.useEffect(() => {
        if (date?.from && date?.to && blockedRanges.length > 0) {
            const isOverlapping = blockedRanges.some(range => {
                const start = range.from;
                const end = range.to;
                return (
                    isWithinInterval(start, { start: date.from!, end: date.to! }) ||
                    isWithinInterval(end, { start: date.from!, end: date.to! }) ||
                    isWithinInterval(date.from!, { start, end })
                );
            });
            setOverlapError(isOverlapping);
        } else {
            setOverlapError(false);
        }
    }, [date, blockedRanges]);

    const totalNights = date?.from && date?.to ? differenceInDays(date.to, date.from) : 0;
    const totalPrice = totalNights * pricePerNight;

    const handleSubmit = async () => {
        if (!date?.from || !date?.to || !guestName || !phone || overlapError) return;

        setSubmitting(true);
        setErrorMessage(null);

        try {
            const currentRequest = { name: guestName, nights: totalNights };

            const payload = {
                guestName,
                phone,
                email,
                notes,
                checkIn: format(date.from, 'yyyy-MM-dd'),
                checkOut: format(date.to, 'yyyy-MM-dd'),
                pricePerNight
            };

            const res = await fetch('/api/booking-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                // Handle 400 / 409
                if (data.error) {
                    setErrorMessage(data.error);
                    // If conflict, maybe show specific error?
                    if (res.status === 409) {
                        setOverlapError(true);
                    }
                } else {
                    setErrorMessage("An error occurred. Please try again.");
                }
                return;
            }

            setLastRequest(currentRequest);
            setSuccess(true);
            setDate(undefined);
            setGuestName('');
            setPhone('');
            setEmail('');
            setNotes('');
        } catch (error) {
            console.error("Error submitting booking:", error);
            setErrorMessage("Network error. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (success && lastRequest) {
        return (
            <Card className="w-full max-w-md mx-auto shadow-lg border-green-100 bg-green-50/50">
                <CardContent className="pt-6 text-center space-y-4">
                    <div className="flex justify-center"><CheckCircle2 className="h-16 w-16 text-green-600" /></div>
                    <h2 className="text-2xl font-bold text-green-800">Request Received!</h2>
                    <p className="text-green-700">Thank you, {lastRequest.name}. We will contact you shortly.</p>
                    <Button variant="outline" className="mt-4 border-green-600 text-green-700 hover:bg-green-100" onClick={() => setSuccess(false)}>Book Another Stay</Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-md mx-auto shadow-lg border-none bg-white/90 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-2xl font-bold text-center font-montserrat text-[rgb(var(--meridian-blue))]">Reserve Your Stay</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={'outline'} className={cn('w-full justify-start text-left font-normal h-12 rounded-xl border-slate-200', !date && 'text-muted-foreground')}>
                                <CalendarIcon className="mr-2 h-4 w-4 text-[rgb(var(--meridian-gold))]" />
                                {date?.from ? (date.to ? `${format(date.from, 'LLL dd')} - ${format(date.to, 'LLL dd')}` : format(date.from, 'LLL dd')) : <span>Check Availability</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="center">
                            {!loading && <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={handleDateSelect} numberOfMonths={1} disabled={[{ before: new Date() }, ...blockedRanges]} min={2} />}
                        </PopoverContent>
                    </Popover>
                    {overlapError && <p className="text-xs text-red-500 text-center font-medium">Selected dates overlap with an existing booking.</p>}
                    {errorMessage && <p className="text-xs text-red-600 text-center font-bold bg-red-50 p-2 rounded">{errorMessage}</p>}
                </div>

                {totalNights > 0 && !overlapError && (
                    <div className="space-y-4 animate-in fade-in">
                        <div className="bg-slate-50 p-4 rounded-xl flex justify-between text-sm font-medium">
                            <span className="font-bold text-[rgb(var(--meridian-blue))]">{totalNights} {totalNights === 1 ? 'Night' : 'Nights'}</span>
                            <span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalPrice)}</span>
                        </div>
                        <div className="space-y-2"><Label>Full Name <span className="text-red-500">*</span></Label><Input value={guestName} onChange={e => setGuestName(e.target.value)} /></div>
                        <div className="space-y-2"><Label>Phone <span className="text-red-500">*</span></Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
                        <div className="space-y-2"><Label>Email</Label><Input value={email} onChange={e => setEmail(e.target.value)} /></div>
                        <div className="space-y-2"><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} /></div>
                    </div>
                )}

                <Button className="w-full h-12 rounded-full text-lg shadow-md bg-[rgb(var(--meridian-gold))]" disabled={totalNights < 1 || !guestName || !phone || submitting || overlapError} onClick={handleSubmit}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {totalNights > 0 ? 'Submit Request' : 'Select Dates'}
                </Button>
            </CardContent>
        </Card>
    );
}
