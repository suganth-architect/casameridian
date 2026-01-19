"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { Loader2, Check, ShieldCheck, Camera, CreditCard } from "lucide-react";
import { IdUpload } from "@/components/checkin/id-upload";
import { LiveSelfie, SelfieAnalysis } from "@/components/checkin/live-selfie";
import { cn } from "@/lib/utils";

// Steps
type Step = "loading" | "id-upload" | "live-selfie" | "processing" | "approved";

export default function CheckInPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [bookingId, setBookingId] = useState<string | null>(null);
    const [step, setStep] = useState<Step>("loading");

    // Data to save
    const [checkInData, setCheckInData] = useState({
        idFrontUrl: "",
        idBackUrl: "",
        selfieUrl: "",
        lightingScore: 0,
        blurScore: 0,
        faceConfidence: 0,
    });

    useEffect(() => {
        const auth = getFirebaseAuth();
        if (!auth) return;

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                // Not logged in -> Home
                router.push("/");
                return;
            }
            setUser(currentUser);
            await checkBookingAndStatus(currentUser);
        });

        return () => unsubscribe();
    }, [router]);

    const checkBookingAndStatus = async (currentUser: User) => {
        const db = getFirestoreDb();
        if (!db || !currentUser.phoneNumber) return;

        try {
            // 1. Find active booking
            const bookingsRef = collection(db, "bookings");
            const q = query(
                bookingsRef,
                where("phone", "==", currentUser.phoneNumber),
                where("status", "==", "confirmed")
            );
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                alert("No active booking found for this number.");
                router.push("/");
                return;
            }

            // Find valid booking for today
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const activeBooking = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any))
                .find(b => {
                    const start = new Date(b.checkIn);
                    const end = new Date(b.checkOut);
                    return today >= start && today <= end;
                });

            if (!activeBooking) {
                alert("No active stay found for today. Check-in is available on your arrival date.");
                router.push("/");
                return;
            }

            setBookingId(activeBooking.id);

            // 2. Check if already checked in
            const checkinRef = doc(db, "checkins", activeBooking.id);
            const checkinSnap = await getDoc(checkinRef);

            if (checkinSnap.exists() && checkinSnap.data().checkinStatus === "approved") {
                // Already done -> My Stay
                router.replace("/my-stay");
            } else {
                // Start Check-in Flow
                setStep("id-upload");
            }

        } catch (error) {
            console.error("Error checking booking:", error);
            alert("System error. Please contact support.");
        }
    };

    const handleIdUploadComplete = (frontUrl: string, backUrl?: string) => {
        setCheckInData(prev => ({ ...prev, idFrontUrl: frontUrl, idBackUrl: backUrl || "" }));
        setStep("live-selfie");
    };

    const handleSelfieComplete = async (selfieUrl: string, analysis: SelfieAnalysis) => {
        setStep("processing");

        // Prepare final data
        const finalData = {
            ...checkInData,
            selfieUrl,
            lightingScore: analysis.lightingScore,
            blurScore: analysis.blurScore,
            faceConfidence: analysis.faceConfidence,
        };

        // Save to Firestore
        const db = getFirestoreDb();
        if (!db || !bookingId || !user) return;

        try {
            await setDoc(doc(db, "checkins", bookingId), {
                bookingId,
                guestUid: user.uid,
                guestPhone: user.phoneNumber,
                ...finalData,
                checkinStatus: "approved", // Auto-approval as per requirements
                approvedAt: serverTimestamp(),
                createdAt: serverTimestamp(),
            });

            setStep("approved");

            // Auto redirect after delay
            setTimeout(() => {
                router.replace("/my-stay");
            }, 4000);

        } catch (error) {
            console.error("Error saving checkin:", error);
            alert("Failed to save check-in. Please try again.");
            setStep("live-selfie"); // Retry step
        }
    };

    if (step === "loading") {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 dark:bg-zinc-950">
                <div className="w-16 h-16 border-4 border-meridian-gold/20 border-t-meridian-gold rounded-full animate-spin" />
                <p className="mt-6 text-sm tracking-[0.2em] uppercase text-stone-500 font-medium animate-pulse">
                    Retrieving Booking
                </p>
            </div>
        );
    }

    if (step === "approved") {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-stone-50 dark:bg-zinc-950 animate-in fade-in duration-700">
                <div className="relative w-full max-w-sm">
                    {/* Glow effect */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-meridian-gold to-amber-200 rounded-[2.2rem] blur opacity-30 animate-pulse" />

                    <div className="relative bg-white dark:bg-zinc-900 border border-stone-100 dark:border-zinc-800 p-8 rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] text-center overflow-hidden">

                        {/* Golden shimmer overlay */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent rotate-45 translate-x-full animate-[shimmer_2s_infinite]" />

                        <div className="mx-auto w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6 ring-1 ring-green-500/20">
                            <Check className="h-10 w-10 text-green-600 dark:text-green-400" />
                        </div>

                        <h2 className="text-3xl font-light text-stone-900 dark:text-stone-50 mb-2 font-serif">
                            Welcome
                        </h2>
                        <div className="h-px w-12 bg-meridian-gold mx-auto mb-4" />

                        <p className="text-stone-500 dark:text-stone-400 font-light leading-relaxed mb-8">
                            Your check-in is complete.
                            <br />
                            We are preparing your digital key.
                        </p>

                        <div className="flex justify-center items-center space-x-2 text-xs uppercase tracking-widest text-stone-400">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Redirecting to Dashboard</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-zinc-950 p-4 md:p-8 font-sans transition-colors duration-500">
            <div className="max-w-xl mx-auto pt-4 pb-20">

                {/* Header Section */}
                <div className="text-center mb-10 space-y-2">
                    <h1 className="text-3xl font-light text-stone-900 dark:text-stone-50 font-serif tracking-tight">
                        Check-in
                    </h1>
                    <p className="text-stone-500 dark:text-stone-400 text-sm">
                        Verify your identity to activate your stay.
                    </p>
                </div>

                {/* Elegant Stepper */}
                <div className="flex items-center justify-center mb-12 px-4">
                    <StepperItem
                        active={step === "id-upload"}
                        completed={step === "live-selfie" || step === "processing"}
                        label="ID Verification"
                        icon={CreditCard}
                    />
                    <StepperConnector active={step === "live-selfie" || step === "processing"} />
                    <StepperItem
                        active={step === "live-selfie" || step === "processing"}
                        completed={step === "processing"}
                        label="Live Selfie"
                        icon={Camera}
                    />
                    <StepperConnector active={step === "processing"} />
                    <StepperItem
                        active={step === "processing"}
                        completed={false}
                        label="Approval"
                        icon={ShieldCheck}
                    />
                </div>

                {/* Content Area */}
                <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm rounded-[2.5rem] p-1 shadow-[0_0_0_1px_rgba(0,0,0,0.03)]">
                    <div className="bg-white dark:bg-zinc-900 rounded-[2.4rem] p-6 md:p-8 shadow-xl shadow-stone-200/50 dark:shadow-none min-h-[500px] transition-all duration-500">

                        {step === "id-upload" && (
                            <IdUpload bookingId={bookingId!} onUploadComplete={handleIdUploadComplete} />
                        )}

                        {step === "live-selfie" && (
                            <LiveSelfie bookingId={bookingId!} onCaptureComplete={handleSelfieComplete} />
                        )}

                        {step === "processing" && (
                            <div className="h-full flex flex-col items-center justify-center py-32 space-y-6 animate-in fade-in duration-500">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-meridian-gold/20 rounded-full animate-ping" />
                                    <div className="relative bg-white dark:bg-zinc-800 p-4 rounded-full shadow-lg border border-stone-100 dark:border-zinc-700">
                                        <Loader2 className="h-8 w-8 animate-spin text-meridian-gold" />
                                    </div>
                                </div>
                                <div className="text-center space-y-2">
                                    <h3 className="text-lg font-medium text-stone-900 dark:text-white">Verifying Identity</h3>
                                    <p className="text-stone-500 text-sm">Matching face biometrics with ID...</p>
                                </div>
                            </div>
                        )}

                    </div>
                </div>

                {/* Footer / Privacy Note */}
                <p className="text-center text-xs text-stone-400 mt-8 max-w-xs mx-auto leading-relaxed">
                    <ShieldCheck className="h-3 w-3 inline mr-1 mb-0.5" />
                    Encrypted & Secure. Your data is used strictly for identity verification and stay authorization.
                </p>
            </div>
        </div>
    );
}

function StepperItem({ active, completed, label, icon: Icon }: { active: boolean, completed: boolean, label: string, icon: any }) {
    return (
        <div className="flex flex-col items-center space-y-2 relative z-10">
            <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-2",
                active || completed
                    ? "bg-meridian-gold border-meridian-gold text-white shadow-lg shadow-meridian-gold/25"
                    : "bg-white dark:bg-zinc-800 border-stone-200 dark:border-zinc-700 text-stone-300 dark:text-zinc-600"
            )}>
                {completed ? <Check className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
            </div>
            <span className={cn(
                "text-[10px] font-medium uppercase tracking-widest absolute -bottom-6 w-32 text-center transition-colors duration-300",
                active ? "text-stone-900 dark:text-white" : "text-stone-300 dark:text-zinc-600"
            )}>
                {label}
            </span>
        </div>
    );
}

function StepperConnector({ active }: { active: boolean }) {
    return (
        <div className="flex-1 h-[1px] bg-stone-200 dark:bg-zinc-800 mx-2 mb-4 relative overflow-hidden">
            <div className={cn(
                "absolute inset-0 bg-meridian-gold transition-transform duration-700 ease-in-out origin-left",
                active ? "scale-x-100" : "scale-x-0"
            )} />
        </div>
    );
}
