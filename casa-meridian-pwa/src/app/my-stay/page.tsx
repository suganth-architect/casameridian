"use client";

import { useEffect, useState } from "react";
import { OtpLogin } from "@/components/otp-login";
import { GuestDashboard } from "@/components/guest-dashboard";
import { getFirebaseAuth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { Loader2, CalendarClock, ChevronsRight, Bug, MapPin } from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";

interface Booking {
    id: string;
    guestName: string;
    phone: string;
    checkIn: string;
    checkOut: string;
    status: string;
    nights: number;
    [key: string]: any;
}

interface DebugData {
    phoneRaw?: string;
    phoneLocal?: string; // Updated to match new API
    bookingsFound?: number;
    todayIST?: string;
}

export default function MyStayPage() {
    const [user, setUser] = useState<User | null>(null);
    const [loadingConfig, setLoadingConfig] = useState(true);

    // State for stays
    const [activeStay, setActiveStay] = useState<Booking | null>(null);
    const [upcomingStay, setUpcomingStay] = useState<Booking | null>(null);
    const [lastStay, setLastStay] = useState<Booking | null>(null);
    const [loadingBooking, setLoadingBooking] = useState(false);

    const [authChecked, setAuthChecked] = useState(false);
    const [debugData, setDebugData] = useState<DebugData | null>(null);

    useEffect(() => {
        const auth = getFirebaseAuth();
        if (!auth) return;

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            setAuthChecked(true);
            setLoadingConfig(false);

            if (currentUser) {
                await fetchBooking(currentUser);
            } else {
                setActiveStay(null);
                setUpcomingStay(null);
                setDebugData(null);
            }
        });

        return () => unsubscribe();
    }, []);

    const fetchBooking = async (currentUser: User) => {
        setLoadingBooking(true);
        try {
            const token = await currentUser.getIdToken();
            const res = await fetch('/api/stay/lookup', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                console.error("Lookup failed");
                return;
            }

            const data = await res.json();
            setActiveStay(data.activeStay);
            setUpcomingStay(data.upcomingStay);
            setLastStay(data.lastStay);
            if (data.debug) {
                setDebugData(data.debug);
            }

        } catch (err) {
            console.error("Error fetching booking:", err);
        } finally {
            setLoadingBooking(false);
        }
    };

    const handleLoginSuccess = async (phone: string) => {
        // Auth state listener handles the user update and fetch
    };

    if (!authChecked || loadingConfig) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[rgb(var(--meridian-gold))]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black p-4 md:p-6 pb-24 font-montserrat">
            <div className="max-w-md mx-auto w-full pt-6 md:pt-12">

                {/* Header Section */}
                <div className="mb-8 text-center">
                    {/* Logo is implicitly in header, but we can add a welcome title if logged in */}
                    {user && !loadingBooking && (
                        <h1 className="text-sm font-semibold tracking-[0.2em] uppercase text-slate-400 mb-2">My Reservation</h1>
                    )}
                </div>

                {!user ? (
                    <OtpLogin onLoginSuccess={handleLoginSuccess} />
                ) : loadingBooking ? (
                    <div className="flex flex-col items-center justify-center space-y-4 py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-[rgb(var(--meridian-gold))]" />
                        <p className="text-muted-foreground animate-pulse font-light">Retrieving stay details...</p>
                    </div>
                ) : activeStay ? (
                    // STATE 1: Active Stay -> Use Dashboard
                    <GuestDashboard
                        guestName={activeStay.guestName || "Guest"}
                        checkIn={activeStay.checkIn}
                        checkOut={activeStay.checkOut}
                        nights={activeStay.nights || differenceInDays(parseISO(activeStay.checkOut), parseISO(activeStay.checkIn))}
                        phone={user.phoneNumber!}
                    />
                ) : upcomingStay ? (
                    // STATE 2: Upcoming Stay -> Premium Card
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-lg shadow-[rgba(var(--meridian-gold),0.05)] border border-[rgba(var(--meridian-gold),0.2)] relative overflow-hidden">
                            {/* Subtle Glow Effect */}
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-[rgb(var(--meridian-gold))] opacity-5 blur-[60px] rounded-full"></div>

                            <div className="relative z-10">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-[rgb(var(--meridian-gold))] text-xs font-bold uppercase tracking-wider rounded-full mb-4">
                                    <CalendarClock className="w-3.5 h-3.5" />
                                    Upcoming
                                </span>

                                <h2 className="text-2xl font-light text-slate-900 dark:text-white mb-1">
                                    Upcoming Stay Confirmed
                                </h2>
                                <p className="text-sm text-slate-500 font-light mb-6">
                                    Your booking is confirmed. We can't wait to host you, <span className="font-medium text-slate-700 dark:text-slate-300">{upcomingStay.guestName}</span>.
                                </p>

                                <div className="space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4 mb-6">
                                    <div className="flex justify-between items-center">
                                        <div className="text-left">
                                            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Check-in</p>
                                            <p className="text-lg font-medium text-slate-800 dark:text-slate-200">
                                                {format(parseISO(upcomingStay.checkIn), 'd MMM yyyy')}
                                            </p>
                                        </div>
                                        <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 mx-4"></div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Check-out</p>
                                            <p className="text-lg font-medium text-slate-800 dark:text-slate-200">
                                                {format(parseISO(upcomingStay.checkOut), 'd MMM yyyy')}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Location/Hotel Name */}
                                    <div className="flex items-start gap-2 pt-2">
                                        <MapPin className="w-4 h-4 text-[rgb(var(--meridian-gold))] mt-0.5" />
                                        <div className="text-xs text-slate-500">
                                            <p className="font-medium text-slate-700 dark:text-slate-300">Casa Meridian</p>
                                            <p>ECR, Chennai</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 text-xs text-slate-500 flex gap-3 leading-relaxed">
                                    <div className="shrink-0 pt-0.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--meridian-gold))]"></div>
                                    </div>
                                    <p>
                                        Check-in starts at 12:00 PM. You will receive access details on the day of arrival.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 text-center">
                            <button
                                onClick={() => getFirebaseAuth()?.signOut()}
                                className="text-xs text-slate-400 hover:text-[rgb(var(--meridian-gold))] transition-colors tracking-wide uppercase border-b border-transparent hover:border-[rgb(var(--meridian-gold))]"
                            >
                                Sign out
                            </button>
                        </div>
                    </div>
                ) : lastStay ? (
                    // STATE 3: Last Stay (History)
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-zinc-800 opacity-75 grayscale hover:grayscale-0 transition-all">
                            <div className="flex items-center gap-2 mb-4 text-slate-500">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold uppercase tracking-wider rounded-full">
                                    Completed
                                </span>
                                <span className="text-xs">
                                    • {differenceInDays(parseISO(lastStay.checkOut), parseISO(lastStay.checkIn))} Nights
                                </span>
                            </div>

                            <h2 className="text-xl font-light text-slate-900 dark:text-white mb-2">
                                Hope you enjoyed your stay
                            </h2>
                            <p className="text-sm text-slate-500 mb-6">
                                Your last visit was in {format(parseISO(lastStay.checkIn), 'MMMM yyyy')}. Come back to Casa Meridian soon!
                            </p>

                            <div className="border-t border-slate-100 dark:border-zinc-800 pt-4 flex justify-between text-sm text-slate-600 dark:text-slate-400">
                                <div>
                                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Check-in</p>
                                    {format(parseISO(lastStay.checkIn), 'd MMM yyyy')}
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Check-out</p>
                                    {format(parseISO(lastStay.checkOut), 'd MMM yyyy')}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 text-center">
                            <button
                                onClick={() => getFirebaseAuth()?.signOut()}
                                className="text-sm text-slate-500 hover:text-[rgb(var(--meridian-gold))] transition-colors underline underline-offset-4"
                            >
                                Sign out and try another number
                            </button>
                        </div>
                    </div>
                ) : (
                    // STATE 4: No Stay Found at all
                    <div className="text-center space-y-6 py-12 animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-8 rounded-2xl shadow-sm">
                            <h2 className="text-lg font-medium text-slate-900 dark:text-white">No active stay found</h2>
                            <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                                We couldn't find any bookings associated with this number.
                            </p>
                        </div>
                        <button
                            onClick={() => getFirebaseAuth()?.signOut()}
                            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
                        >
                            Sign out and try a different number
                        </button>
                    </div>
                )}

                {/* Diagnostics Panel (Task B2 - Preserved) */}
                {process.env.NEXT_PUBLIC_DEBUG === "true" && debugData && (
                    <div className="mt-8 p-4 bg-slate-100 dark:bg-zinc-800 rounded-lg text-xs font-mono overflow-hidden">
                        <div className="flex items-center gap-2 mb-2 text-slate-500 font-bold uppercase tracking-wider">
                            <Bug className="w-4 h-4" /> Debug Diagnostics
                        </div>
                        <pre className="whitespace-pre-wrap break-words opacity-75">
                            {JSON.stringify(debugData, null, 2)}
                        </pre>
                        {user?.phoneNumber && (
                            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-zinc-700">
                                <p>User Phone: {user.phoneNumber}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
