"use client";

import { useEffect, useState } from "react";
import { OtpLogin } from "@/components/otp-login";
import { GuestDashboard } from "@/components/guest-dashboard";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Loader2 } from "lucide-react";

interface Booking {
    id: string;
    guestName: string;
    phone: string;
    checkIn: string;
    checkOut: string;
    status: string;
    [key: string]: any;
}

export default function MyStayPage() {
    const [user, setUser] = useState<User | null>(null);
    const [loadingConfig, setLoadingConfig] = useState(true);
    const [booking, setBooking] = useState<Booking | null>(null);
    const [loadingBooking, setLoadingBooking] = useState(false);
    const [authChecked, setAuthChecked] = useState(false);

    useEffect(() => {
        const auth = getFirebaseAuth();
        if (!auth) return;

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setAuthChecked(true);
            setLoadingConfig(false);

            if (currentUser?.phoneNumber) {
                fetchBooking(currentUser.phoneNumber);
            } else {
                setBooking(null);
            }
        });

        return () => unsubscribe();
    }, []);

    const fetchBooking = async (phone: string) => {
        setLoadingBooking(true);
        const db = getFirestoreDb();
        if (!db) return;

        try {
            // Query for bookings by this phone
            // Note: Phone number format in DB must match phone number from Auth (E.164)
            // Ideally we normalize both, but for now assuming direct match or handled suffix

            const bookingsRef = collection(db, "bookings");
            const q = query(
                bookingsRef,
                where("phone", "==", phone),
                where("status", "==", "confirmed")
            );

            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                console.log("No bookings found for phone:", phone);
                setBooking(null);
            } else {
                // Find the booking that covers today
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const activeBooking = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking))
                    .find(b => {
                        const start = new Date(b.checkIn);
                        const end = new Date(b.checkOut);
                        // Simple validation: today >= checkIn AND today < checkOut
                        // (Assuming user can access dashboard on check-out day until they leave)
                        return today >= start && today <= end;
                    });

                if (activeBooking) {
                    setBooking(activeBooking);
                } else {
                    setBooking(null);
                }
            }

        } catch (err) {
            console.error("Error fetching booking:", err);
        } finally {
            setLoadingBooking(false);
        }
    };

    const handleLoginSuccess = (phone: string) => {
        // Auth state listener will pick this up, but we can trigger fetch immediately if needed
        // Actually onAuthStateChanged handles it.
    };

    if (!authChecked || loadingConfig) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black p-4 md:p-8">
            <div className="max-w-md mx-auto w-full pt-10 md:pt-20">
                {!user ? (
                    <OtpLogin onLoginSuccess={handleLoginSuccess} />
                ) : loadingBooking ? (
                    <div className="flex flex-col items-center justify-center space-y-4 py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
                        <p className="text-muted-foreground animate-pulse">Finding your reservation...</p>
                    </div>
                ) : booking ? (
                    <GuestDashboard
                        guestName={booking.guestName || "Guest"}
                        checkIn={booking.checkIn}
                        checkOut={booking.checkOut}
                        nights={
                            Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24))
                        }
                        phone={user.phoneNumber!}
                    />
                ) : (
                    <div className="text-center space-y-6 py-20 animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-white dark:bg-zinc-900 border border-amber-100 dark:border-zinc-800 p-8 rounded-2xl shadow-sm">
                            <h2 className="text-xl font-medium text-foreground">No active stay found</h2>
                            <p className="text-muted-foreground mt-2 text-sm">
                                We couldn't find a confirmed booking for today associated with <span className="font-mono text-amber-600">{user.phoneNumber}</span>.
                            </p>
                            <p className="text-xs text-muted-foreground mt-6">
                                Check-in starts at 12:00 PM. If you believe this is an error, please contact support.
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
            </div>
        </div>
    );
}
