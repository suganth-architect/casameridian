"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getFirebaseAuth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { Loader2, Check, ShieldCheck, Phone, Info, AlertTriangle, Calendar, Moon } from "lucide-react";
import { IdUpload } from "@/components/checkin/id-upload";
import { LiveSelfie, SelfieAnalysis } from "@/components/checkin/live-selfie";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Feature Flag
const ENABLE_SELFIE_KYC = false;

// Steps
type Step = "phone-input" | "booking-summary" | "id-upload" | "live-selfie" | "status" | "error";

interface BookingData {
    id: string;
    guestName: string; // Masked
    checkIn: string;
    checkOut: string;
    nights: number;
    kycStatus: "not_submitted" | "submitted" | "verified" | "rejected";
    rejectionReason?: string;
    status: string;
}

export default function CheckInPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [step, setStep] = useState<Step>("phone-input"); // Start at phone input even if logged in, or auto-fetch?
    // Good UX: If logged in, auto-fetch.

    const [isLoading, setIsLoading] = useState(false);
    const [phoneInput, setPhoneInput] = useState("");
    const [booking, setBooking] = useState<BookingData | null>(null);
    const [errorMsg, setErrorMsg] = useState("");

    // Auth State Observer
    useEffect(() => {
        const auth = getFirebaseAuth();
        if (!auth) return;

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                if (currentUser.phoneNumber) {
                    setPhoneInput(currentUser.phoneNumber);
                    // Optionally auto-fetch here if we want instant check-in
                    fetchBooking(currentUser.phoneNumber);
                }
            } else {
                // If not logged in, we stay on phone-input step
                setStep("phone-input");
            }
        });

        return () => unsubscribe();
    }, []);

    const fetchBooking = async (phone: string) => {
        if (!phone) return;
        setIsLoading(true);
        setErrorMsg("");

        try {
            const res = await fetch('/api/check-in/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone })
            });

            if (!res.ok) {
                const err = await res.json();
                if (res.status === 404) {
                    setErrorMsg("No active booking found for this number.");
                } else {
                    setErrorMsg(err.error || "Unable to retrieve booking.");
                }
                setStep("phone-input"); // Stay on input to retry
                return;
            }

            const data = await res.json();
            setBooking(data);
            setStep("booking-summary");

        } catch (error) {
            console.error("Error fetching booking:", error);
            setErrorMsg("Network error. Please check your connection.");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePhoneSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchBooking(phoneInput);
    };

    const handleProceed = () => {
        if (!booking) return;

        // If verified or submitted, view status
        if (['verified', 'submitted'].includes(booking.kycStatus)) {
            setStep("status");
            return;
        }

        // If rejected, allow re-upload -> Go to Upload
        if (booking.kycStatus === 'rejected') {
            setStep("id-upload");
            return;
        }

        // Default -> Upload
        setStep("id-upload");
    };

    const handleUploadComplete = (status: string) => {
        if (booking) {
            setBooking(prev => prev ? { ...prev, kycStatus: status as any } : null);
        }

        if (ENABLE_SELFIE_KYC) {
            setStep("live-selfie");
        } else {
            setStep("status");
        }
    };

    const handleSelfieComplete = (url: string, analysis: SelfieAnalysis) => {
        // Handle selfie logic if enabled
        setStep("status");
    };

    // Helper for Status Badge Color
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'verified': return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
            case 'rejected': return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
            case 'submitted': return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800";
            default: return "bg-stone-100 text-stone-600 dark:bg-zinc-800 dark:text-stone-400 border-stone-200 dark:border-zinc-700";
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'verified': return "Verified";
            case 'rejected': return "Action Required";
            case 'submitted': return "Under Review";
            default: return "Pending";
        }
    };

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-zinc-950 p-4 md:p-8 font-sans">
            <div className="max-w-xl mx-auto pt-8 pb-20">

                {/* Header */}
                <div className="text-center mb-10 space-y-2">
                    <h1 className="text-3xl font-light text-stone-900 dark:text-stone-50 font-serif tracking-tight">
                        Check-in
                    </h1>
                    <p className="text-stone-500 dark:text-stone-400 text-sm">
                        Casa Meridian • Guest Access
                    </p>
                </div>

                {/* Steps Container */}
                <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm rounded-[2.5rem] p-1 shadow-[0_0_0_1px_rgba(0,0,0,0.03)]">
                    <div className="bg-white dark:bg-zinc-900 rounded-[2.4rem] p-6 md:p-8 shadow-xl shadow-stone-200/50 dark:shadow-none min-h-[400px] transition-all duration-500 relative overflow-hidden">

                        {/* Decorative Background */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-meridian-gold/5 rounded-full filter blur-3xl -z-10 -mr-16 -mt-16" />

                        {/* STEP 1: PHONE INPUT */}
                        {step === "phone-input" && (
                            <div className="h-full flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 py-8">
                                <div className="text-center space-y-2">
                                    <h2 className="text-xl font-medium text-stone-900 dark:text-stone-50">Find Your Booking</h2>
                                    <p className="text-stone-500 text-sm">Enter the phone number used for booking.</p>
                                </div>

                                <form onSubmit={handlePhoneSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Input
                                            type="tel"
                                            placeholder="+91 98765 43210"
                                            value={phoneInput}
                                            onChange={(e) => setPhoneInput(e.target.value)}
                                            className="text-center text-lg h-14 bg-stone-50 dark:bg-zinc-800 border-stone-200 dark:border-zinc-700 rounded-xl focus:ring-meridian-gold"
                                            required
                                        />
                                    </div>

                                    {errorMsg && (
                                        <div className="text-center text-red-500 text-sm font-medium bg-red-50 dark:bg-red-900/10 py-2 rounded-lg">
                                            {errorMsg}
                                        </div>
                                    )}

                                    <Button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full h-12 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
                                    >
                                        {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Continue"}
                                    </Button>
                                </form>
                            </div>
                        )}

                        {/* STEP 2: BOOKING SUMMARY */}
                        {step === "booking-summary" && booking && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
                                <div className="text-center">
                                    <Badge variant="outline" className={cn("mb-4 px-3 py-1 rounded-full uppercase tracking-wider text-[10px] font-bold", getStatusColor(booking.kycStatus))}>
                                        {getStatusLabel(booking.kycStatus)}
                                    </Badge>
                                    <h2 className="text-2xl font-serif text-stone-900 dark:text-stone-50">Welcome, {booking.guestName}</h2>
                                </div>

                                <Card className="border-stone-100 dark:border-zinc-800 shadow-sm bg-stone-50/50 dark:bg-zinc-900/50">
                                    <CardContent className="p-6 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <p className="text-xs uppercase tracking-widest text-stone-400">Check-in</p>
                                                <p className="font-medium text-stone-900 dark:text-stone-100">{booking.checkIn}</p>
                                            </div>
                                            <div className="h-8 w-px bg-stone-200 dark:bg-zinc-700 mx-4" />
                                            <div className="space-y-1 text-right">
                                                <p className="text-xs uppercase tracking-widest text-stone-400">Check-out</p>
                                                <p className="font-medium text-stone-900 dark:text-stone-100">{booking.checkOut}</p>
                                            </div>
                                        </div>
                                        <Separator />
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center text-stone-500">
                                                <Moon className="h-4 w-4 mr-2" />
                                                <span>Duration</span>
                                            </div>
                                            <span className="font-medium text-stone-900 dark:text-stone-100">{booking.nights} Night{booking.nights > 1 ? 's' : ''}</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                {booking.kycStatus === 'rejected' && booking.rejectionReason && (
                                    <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-800 flex items-start space-x-3">
                                        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-red-700 dark:text-red-400">Verification Rejected</p>
                                            <p className="text-sm text-red-600 dark:text-red-300">{booking.rejectionReason}</p>
                                        </div>
                                    </div>
                                )}

                                <Button
                                    onClick={handleProceed}
                                    className="w-full h-14 rounded-xl text-lg font-medium shadow-meridian-gold/20 shadow-lg bg-gradient-to-r from-stone-900 to-stone-800 hover:from-black hover:to-stone-900"
                                >
                                    {['verified', 'submitted'].includes(booking.kycStatus) ? "View Status" : (booking.kycStatus === 'rejected' ? "Re-upload Documents" : "Start Verification")}
                                </Button>

                                <button onClick={() => setStep("phone-input")} className="w-full text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors">
                                    Not you? Find another booking
                                </button>
                            </div>
                        )}

                        {/* STEP 3: ID UPLOAD */}
                        {step === "id-upload" && booking && (
                            <IdUpload
                                bookingId={booking.id}
                                kycStatus={booking.kycStatus}
                                onUploadComplete={handleUploadComplete}
                            />
                        )}

                        {/* OPTIONAL: LIVE SELFIE */}
                        {step === "live-selfie" && booking && ENABLE_SELFIE_KYC && (
                            <LiveSelfie
                                bookingId={booking.id}
                                onCaptureComplete={handleSelfieComplete}
                            />
                        )}

                        {/* STEP 4: STATUS */}
                        {step === "status" && booking && (
                            <div className="h-full flex flex-col items-center justify-center text-center animate-in fade-in duration-700 py-10">

                                {booking.kycStatus === 'verified' ? (
                                    <>
                                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                                            <Check className="h-10 w-10 text-green-600 dark:text-green-400" />
                                        </div>
                                        <h2 className="text-2xl font-serif text-stone-900 dark:text-stone-50 mb-2">You're All Set!</h2>
                                        <p className="text-stone-500 mb-8 max-w-xs">Your identity has been verified. You are ready for check-in.</p>
                                        <Button className="bg-stone-900 text-white rounded-xl px-8" onClick={() => router.push('/my-stay')}>
                                            Go to Dashboard
                                        </Button>
                                    </>
                                ) : booking.kycStatus === 'submitted' || booking.kycStatus === 'not_submitted' ? (
                                    <>
                                        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-6">
                                            <ShieldCheck className="h-10 w-10 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <h2 className="text-2xl font-serif text-stone-900 dark:text-stone-50 mb-2">Verification Submitted</h2>
                                        <p className="text-stone-500 mb-8 max-w-xs">
                                            We have received your documents. Our team will verify them shortly.
                                        </p>
                                        <Button variant="outline" className="rounded-xl px-8" onClick={() => router.push('/my-stay')}>
                                            Check Status Later
                                        </Button>
                                    </>
                                ) : (
                                    /* Rejected Case in Status View (unlikely route, but safe fallback) */
                                    <>
                                        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
                                            <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400" />
                                        </div>
                                        <h2 className="text-2xl font-serif text-stone-900 dark:text-stone-50 mb-2">Verification Failed</h2>
                                        <p className="text-stone-500 mb-8 max-w-xs">
                                            {booking.rejectionReason || "Please re-upload clear documents."}
                                        </p>
                                        <Button className="bg-stone-900 text-white rounded-xl px-8" onClick={() => setStep('id-upload')}>
                                            Try Again
                                        </Button>
                                    </>
                                )}
                            </div>
                        )}

                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-xs text-stone-400 max-w-xs mx-auto flex items-center justify-center space-x-1">
                        <ShieldCheck className="h-3 w-3" />
                        <span>Secure SSL Encrypted Transmission</span>
                    </p>
                </div>

            </div>
        </div>
    );
}
