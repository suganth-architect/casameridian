"use client";

import { useEffect, useState } from "react";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface BookingWidgetProps {
    pricePerNight: number;
}

interface BlockedDateRange {
    from: Date;
    to: Date;
}

export function BookingWidget({ pricePerNight }: BookingWidgetProps) {
    const [date, setDate] = useState<DateRange | undefined>();
    const [blockedDates, setBlockedDates] = useState<BlockedDateRange[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        async function fetchAvailability() {
            try {
                const res = await fetch("/api/availability");
                if (!res.ok) throw new Error("Failed to fetch availability");

                const data = await res.json();

                // Expecting { blocked: { from: string, to: string }[] }
                // Parse strings 'yyyy-MM-dd' to Date objects
                const parsed = (data.blocked || []).map((range: { from: string; to: string }) => ({
                    from: parseISO(range.from),
                    to: parseISO(range.to),
                }));

                setBlockedDates(parsed);
                setError(false);
            } catch (error) {
                console.error("Failed to fetch availability", error);
                setError(true);
            } finally {
                setLoading(false);
            }
        }
        fetchAvailability();
    }, []);

    const nights =
        date?.from && date?.to
            ? differenceInCalendarDays(date.to, date.from)
            : 0;

    const totalAmount = nights * pricePerNight;

    // Validation:
    // 1. Min 1 night (nights > 0)
    // 2. Not loading
    const isValid = nights >= 1 && !loading;

    // Disabled dates for the calendar
    const disabledDays = [
        ...blockedDates,
        { before: new Date() } // Disable past dates
    ];

    const handleBook = () => {
        if (!isValid) return;

        console.log("Proceed to Request:", {
            dates: date,
            nights,
            totalAmount,
        });
        // Here you would typically navigate to a checkout page or open a modal
    };

    return (
        <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl ring-1 ring-gray-200">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">Price per night</p>
                    <p className="text-2xl font-bold text-meridian-blue">
                        ₹{pricePerNight.toLocaleString()}
                    </p>
                </div>
                {loading && <Loader2 className="h-5 w-5 animate-spin text-meridian-gold" />}
            </div>

            <div className="grid gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                                "w-full justify-start text-left font-normal h-12",
                                !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.from ? (
                                date.to ? (
                                    <>
                                        {format(date.from, "LLL dd, y")} -{" "}
                                        {format(date.to, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(date.from, "LLL dd, y")
                                )
                            ) : (
                                <span>Pick a date range</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={setDate}
                            numberOfMonths={2}
                            disabled={disabledDays}
                            min={1}
                        />
                    </PopoverContent>
                </Popover>
                {error && (
                    <p className="text-xs text-red-500 mt-1">Could not sync calendar. Please check manually.</p>
                )}
            </div>

            <div className="space-y-4 border-t pt-4">
                <div className="flex justify-between text-sm">
                    <span>
                        ₹{pricePerNight.toLocaleString()} x {nights} nights
                    </span>
                    <span>₹{totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t pt-4 font-bold text-lg">
                    <span>Total</span>
                    <span>₹{totalAmount.toLocaleString()}</span>
                </div>
            </div>

            <Button
                onClick={handleBook}
                disabled={!isValid}
                className="w-full bg-meridian-gold hover:bg-meridian-gold/90 text-white rounded-full py-6 text-lg"
            >
                {nights < 1 ? "Select Dates" : "Request to Book"}
            </Button>
        </div>
    );
}
